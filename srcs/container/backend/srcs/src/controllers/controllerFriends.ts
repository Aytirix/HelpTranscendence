import { Message, Group, User, Friends } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage, req_accept_friend, res_accept_friend, res_add_friend, req_add_friend, req_remove_friend, res_remove_friend, req_refuse_friend, res_refuse_friend, reponse, req_block_user, res_block_user, req_search_user, res_search_user } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import modelsUser from '@models/modelUser';
import { IncomingMessage } from 'http';

export async function getFriends(userId: number, state: State): Promise<User[]> {
	const friendsIds = await modelsFriends.getFriendsForUser(userId, state);

	if (friendsIds.length === 0) return [];

	// add is connected
	for (const friend of friendsIds) {
		if (state.onlineSockets.has(friend.id)) { friend.online = true; }
		else { friend.online = false; }
	}
	return friendsIds;
}

export function getRelationFriend(user_id: number, friend_id: number, state: State): Friends | undefined {
	let relation: Friends | undefined;
	for (const friend of state.friends.values()) {
		if ((friend.user_one_id === user_id && friend.user_two_id === friend_id) ||
			(friend.user_one_id === friend_id && friend.user_two_id === user_id)) {
			relation = friend;
			break;
		}
	}
	return relation;
}

/**
 * Vérifie si un utilisateur est bloqué par un autre utilisateur ou s'il a bloqué un autre utilisateur.
 *
 * @param ws - Instance de WebSocket utilisée pour envoyer des notifications à l'utilisateur.
 * @param user - L'utilisateur actuel effectuant l'action.
 * @param friend - L'utilisateur ami ou cible de l'action.
 * @param state - L'état global contenant les relations d'amitié.
 * @param shouldBlock - Indique si une notification doit être envoyée en cas de blocage.
 * @returns `true` si l'utilisateur est bloqué ou a bloqué l'autre utilisateur, sinon `false`.
 */
export function userIsBlocked(ws: WebSocket, user: User, friend: User, state: State, shouldBlock: boolean): boolean {
	const relation = getRelationFriend(user.id, friend.id, state);

	if (relation && relation.status === 'blocked' && relation.target === user.id) {
		if (shouldBlock) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`L'utilisateur ${friend.username} vous a bloqué`] } as reponse));
		}
		return true;
	}

	if (relation && relation.status === 'blocked' && relation.target === friend.id) {
		if (shouldBlock) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Vous avez bloqué l'utilisateur ${friend.username}`] } as reponse));
		}
		return true;
	}

	if (!shouldBlock) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`L'utilisateur ${friend.username} n'est pas bloqué`] } as reponse));
	}

	return false;
}

export const searchUser = async (ws: WebSocket, user: User, state: State, text: req_search_user) => {
	const { name } = text;
	let users: User[] = [];
	if (name && name.length >= 3 && name.length <= 15) {
		users = await modelsUser.searchUser(name);
		if (users.length === 0) {
			return;
		}
	}

	// filtrer les utilisateurs pour ne pas afficher l'utilisateur lui-même et ceux qui sont déjà amis
	users = users.filter((userSearch) => {
		if (userSearch.id === user.id) return false;
		let relation: Friends | undefined;
		for (const [, friend] of state.friends) {
			if ((friend.user_one_id === user.id && friend.user_two_id === userSearch.id) ||
				(friend.user_one_id === userSearch.id && friend.user_two_id === user.id)) {
				relation = friend;
				break;
			}
		}
		if (relation && relation.status != '') {
			return false;
		}
		return true;
	});

	ws.send(JSON.stringify({
		action: 'search_user',
		result: 'ok',
		users,
	} as res_search_user));
}

export const addFriend = async (ws: WebSocket, user: User, state: State, text: req_add_friend) => {
	const { user_id } = text;
	if (!user_id) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));
		return;
	}

	const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
	if (!friend) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'existe pas'] } as reponse));
	if (friend.id === user.id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous ne pouvez pas faire une demande d\'ami à vous-même'] } as reponse));

	const relation = getRelationFriend(user.id, user_id, state);

	if (relation) {
		switch (relation.status) {
			case 'friend':
				ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous êtes déjà amis'] } as reponse));
				return;
			case 'blocked':
				if (relation.target === user.id) {
					ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur vous a bloqué'] } as reponse));
				}
				else if (relation.target === friend.id) {
					ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous avez bloqué cet utilisateur'] } as reponse));
				}
				return;
			case 'pending':
				if (relation.target === user.id) {
					ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous avez déjà envoyé une demande d\'ami à cet utilisateur'] } as reponse));
				}
				else if (relation.target === friend.id) {
					ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur vous a déjà envoyé une demande d\'ami'] } as reponse));
				}
				return;
		}
	}

	if (await modelsFriends.updateFriendRelation(user, friend, 'pending', null, state) == false) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de l'envoi de la demande d'ami.`] } as reponse));

	if (friend.online) {
		const wsFriend = state.onlineSockets.get(friend.id);
		if (wsFriend) {
			wsFriend.send(JSON.stringify({
				action: 'add_friend',
				result: 'ok',
				user: {
					id: user.id,
					username: user.username,
					avatar: user.avatar,
					lang: user.lang,
					online: user.online
				},
				notification: [`${user.username} vous a envoyé une demande d'ami`],
			} as res_add_friend));
		}
	}
	ws.send(JSON.stringify({
		action: 'add_friend',
		result: 'ok',
		user: {
			id: friend.id,
			username: friend.username,
			avatar: friend.avatar,
			lang: friend.lang,
			online: friend.online
		},
		notification: [`Vous avez envoyé une demande d'ami à ${friend.username}`],
	} as res_add_friend));
}

export const removeFriend = async (ws: WebSocket, user: User, state: State, text: req_remove_friend) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
	if (!friend) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'existe pas'] } as reponse));

	const relation = getRelationFriend(user.id, friend.id, state);
	if (!relation) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as reponse));

	switch (relation.status) {
		case 'friend':
			if (await modelsFriends.updateFriendRelation(user, friend, '', false, state) == false) {
				ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de la suppression de l'ami`] } as reponse));
				break;
			}
			if (friend.online) {
				const wsFriend = state.onlineSockets.get(friend.id);
				if (wsFriend) {
					wsFriend.send(JSON.stringify({
						action: 'remove_friend',
						user_id: user.id,
						group_id: relation.group_id,
						result: 'ok',
						notification: [`${user.username} vous a supprimé de ses amis`],
					} as res_remove_friend));
				}
			}
			ws.send(JSON.stringify({
				action: 'remove_friend',
				user_id: friend.id,
				group_id: relation.group_id,
				result: 'ok',
				notification: [`Vous avez supprimé ${friend.username} de vos amis`],
			} as res_remove_friend));
			break;
	}
}

export const acceptFriend = async (ws: WebSocket, user: User, state: State, text: req_accept_friend) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const relation = getRelationFriend(user.id, user_id, state);
	if (!relation) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as reponse));

	if (relation.status === 'pending' && relation.target === user.id) {
		const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
		let groupPrivMsg: Group | null = await modelsChat.createPrivateGroup(user, friend, state);
		if (groupPrivMsg == null) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Erreur lors de la création du groupe privé'] } as reponse));
			return;
		}
		if (await modelsFriends.updateFriendRelation(user, friend, 'friend', groupPrivMsg.id, state) == false) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de l'acceptation de la demande d'ami`] } as reponse));
			return;
		}
		if (friend) {
			ws.send(JSON.stringify({
				action: 'accept_friend',
				result: 'ok',
				user: {
					id: friend.id,
					username: friend.username,
					avatar: friend.avatar,
					lang: friend.lang,
					online: friend.online,
				},
				group: groupPrivMsg,
				notification: [`Vous avez accepté la demande d'ami de ${friend.username}`],
			} as res_accept_friend));
		}
		if (friend.online) {
			const wsFriend = state.onlineSockets.get(friend.id);
			if (wsFriend) {
				wsFriend.send(JSON.stringify({
					action: 'accept_friend',
					result: 'ok',
					user: {
						id: user.id,
						username: user.username,
						avatar: user.avatar,
						lang: user.lang,
						online: user.online
					},
					group: groupPrivMsg,
					notification: [`${user.username} a accepté votre demande d'ami`],
				} as res_accept_friend));
			}
		}
	}
}

export const refuseFriend = async (ws: WebSocket, user: User, state: State, text: req_refuse_friend) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const relation = getRelationFriend(user.id, user_id, state);
	if (!relation) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as reponse));

	if (relation.status === 'pending' && relation.target === user.id) {
		const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
		let groupPrivMsg: Group | null = await modelsChat.createPrivateGroup(user, friend, state);
		if (groupPrivMsg == null) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Erreur lors de la création du groupe privé'] } as reponse));
			return;
		}
		if (await modelsFriends.updateFriendRelation(user, friend, '', groupPrivMsg.id, state) == false) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de la suppression de la demande d'ami`] } as reponse));
			return;
		}
		if (friend) {
			ws.send(JSON.stringify({
				action: 'refuse_friend',
				user_id: friend.id,
				group_id: groupPrivMsg.id,
				result: 'ok',
				notification: [`Vous avez refusé la demande d'ami de ${friend.username}`],
			} as res_refuse_friend));
		}
		if (friend.online) {
			const wsFriend = state.onlineSockets.get(friend.id);
			if (wsFriend) {
				wsFriend.send(JSON.stringify({
					action: 'refuse_friend',
					user_id: user.id,
					group_id: groupPrivMsg.id,
					result: 'ok',
					notification: [`${user.username} a refusé votre demande d'ami`],
				} as res_refuse_friend));
			}
		}
	}
}

export const cancelFriend = async (ws: WebSocket, user: User, state: State, text: req_refuse_friend) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const relation = getRelationFriend(user.id, user_id, state);
	if (!relation) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as reponse));

	if (relation.status === 'pending' && relation.target !== user.id) {
		const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
		if (await modelsFriends.updateFriendRelation(user, friend, '', false, state) == false) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de la suppression de la demande d'ami`] } as reponse));

		if (friend) {
			ws.send(JSON.stringify({
				action: 'refuse_friend',
				result: 'ok',
				user_id: friend.id,
				group_id: relation.group_id,
				notification: [`Vous avez annulé la demande d'ami a ${friend.username}`],
			} as res_refuse_friend));
		}
		if (friend.online) {
			const wsFriend = state.onlineSockets.get(friend.id);
			if (wsFriend) {
				wsFriend.send(JSON.stringify({
					action: 'refuse_friend',
					result: 'ok',
					user_id: user.id,
					group_id: relation.group_id,
					notification: [`${user.username} a annulé la demande d'ami`],
				} as res_refuse_friend));
			}
		}
	}
}

export const blockFriend = async (ws: WebSocket, user: User, state: State, text: req_block_user) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);
	if (userIsBlocked(ws, user, friend, state, true)) return;

	if (await modelsFriends.updateFriendRelation(user, friend, 'blocked', false, state) == false) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de du blocage de ${friend.username}`] } as reponse));

	const relation = getRelationFriend(user.id, friend.id, state);
	ws.send(JSON.stringify({
		action: 'block_user',
		result: 'ok',
		user_id: friend.id,
		group_id: relation.group_id,
		notification: [`Vous avez bloqué ${friend.username}`],
	} as res_block_user));
	if (friend.online) {
		const wsFriend = state.onlineSockets.get(friend.id);
		if (wsFriend) {
			wsFriend.send(JSON.stringify({
				action: 'block_user',
				result: 'ok',
				user_id: user.id,
				notification: [`${user.username} vous a bloqué`],
			} as res_block_user));
		}
	}
}

export const unBlockFriend = async (ws: WebSocket, user: User, state: State, text: req_block_user) => {
	const { user_id } = text;
	if (!user_id) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as reponse));

	const friend = state.user.get(user_id) || await modelsUser.getUserById(user_id);

	if (!userIsBlocked(ws, user, friend, state, false)) return;

	const relation = getRelationFriend(user.id, friend.id, state);
	if (!relation) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as reponse));

	if (relation.target === user.id) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous ne pouvez pas débloquer un utilisateur qui vous a bloqué'] } as reponse));
		return;
	}

	if (await modelsFriends.updateFriendRelation(user, friend, '', false, state) == false) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de la suppression du blocage de ${friend.username}`] } as reponse));

	ws.send(JSON.stringify({
		action: 'unblock_user',
		result: 'ok',
		user_id: friend.id,
		notification: [`Vous avez débloqué ${friend.username}`],
	} as res_block_user));
	if (friend.online) {
		const wsFriend = state.onlineSockets.get(friend.id);
		if (wsFriend) {
			wsFriend.send(JSON.stringify({
				action: 'unblock_user',
				result: 'ok',
				user_id: user.id,
				notification: [`${user.username} vous a débloqué`],
			} as res_block_user));
		}
	}
}

export default {
	getFriends,
	getRelationFriend,
	userIsBlocked,
	searchUser,
	addFriend,
	acceptFriend,
	removeFriend,
	refuseFriend,
	cancelFriend,
	blockFriend,
	unBlockFriend,
};