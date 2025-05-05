import { Message, Group, User, Friends } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage, req_accept_friend, res_accept_friend, res_add_friend, req_add_friend, req_remove_friend, res_remove_friend } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import modelsUser from '@models/modelUser';
import { IncomingMessage } from 'http';

export function getConnectedFriends(userId: number, state: State): User[] {
	const friendsIds = state.friendsByUser.get(userId) || [];

	return friendsIds
		.map(friendId => state.user.get(friendId))
		.filter((user): user is User => user !== undefined)
		.filter(user => state.onlineSockets.has(user.id));
}

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

function buildFriendsMap(friends: Friends[]): Map<number, number[]> {
	const map = new Map<number, number[]>();

	for (const relation of friends) {
		const { user_one_id: a, user_two_id: b } = relation;

		if (!map.has(a)) map.set(a, []);
		if (!map.has(b)) map.set(b, []);

		map.get(a)!.push(b);
		map.get(b)!.push(a);
	}

	return map;
}

export const addFriendRequest = async (ws: WebSocket, user: User, state: State, text: req_add_friend) => {
	const { user_id } = text;
	if (!user_id) {
		ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as res_add_friend));
		return;
	}

	const friend = await modelsUser.getUserById(user_id);
	if (!friend) {
		ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Cet utilisateur n\'existe pas'] } as res_add_friend));
		return;
	}
	if (friend.id === user.id) {
		ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Vous ne pouvez pas faire une demande d\'ami à vous-même'] } as res_add_friend));
		return;
	}
	const relation = state.friends.find(friend =>
		(friend.user_one_id === user.id && friend.user_two_id === user_id) ||
		(friend.user_one_id === user_id && friend.user_two_id === user.id));
	if (relation) {
		switch (relation.status) {
			case 'friend':
				ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Vous êtes déjà amis'] } as res_add_friend));
				return;
			case 'blocked':
				if (relation.target === user.id) {
					ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Cet utilisateur vous a bloqué'] } as res_add_friend));
				}
				else if (relation.target === friend.id) {
					ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Vous avez déjà bloqué cet utilisateur'] } as res_add_friend));
				}
				return;
			case 'pending':
				if (relation.target === user.id) {
					ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Vous avez déjà envoyé une demande d\'ami à cet utilisateur'] } as res_add_friend));
				}
				else if (relation.target === friend.id) {
					ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: ['Cet utilisateur vous a déjà envoyé une demande d\'ami'] } as res_add_friend));
				}
				return;
		}
	}

	if (await modelsFriends.updateFriendRelation(user, friend, 'pending', null, state) == false) {
		ws.send(JSON.stringify({ action: 'add_friend', result: 'error', notification: [`Erreur lors de l'envoi de la demande d'ami.`] } as res_add_friend));
		return;
	}

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
		notification: [`Vous avez envoyé une demande d'ami à ${friend.username}`],
	} as res_add_friend));
}

export const removeFriendRequest = async (ws: WebSocket, user: User, state: State, text: req_remove_friend) => {
	const { user_id } = text;
	if (!user_id) {
		ws.send(JSON.stringify({ action: 'remove_friend', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as res_remove_friend));
		return;
	}
	const friend = state.user.get(user_id);
	if (!friend) {
		ws.send(JSON.stringify({ action: 'remove_friend', result: 'error', notification: ['Cet utilisateur n\'existe pas'] } as res_remove_friend));
		return;
	}
	const relation = state.friends.find(friend =>
		(friend.user_one_id === user.id && friend.user_two_id === user_id) ||
		(friend.user_one_id === user_id && friend.user_two_id === user.id) || relation.status === '');
	if (!relation) {
		ws.send(JSON.stringify({ action: 'remove_friend', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as res_remove_friend));
		return;
	}
	switch (relation.status) {
		case 'friend':
			if (await modelsFriends.updateFriendRelation(user, friend, '', relation.group_id, state) == false) {
				ws.send(JSON.stringify({ action: 'remove_friend', result: 'error', notification: [`Erreur lors de la suppression de l'ami`] } as res_remove_friend));
				return;
			}
			if (friend.online) {
				const wsFriend = state.onlineSockets.get(friend.id);
				if (wsFriend) {
					wsFriend.send(JSON.stringify({
						action: 'remove_friend',
						result: 'ok',
						notification: [`${user.username} vous a supprimé de ses amis`],
					} as res_remove_friend));
				}
			}
			ws.send(JSON.stringify({
				action: 'remove_friend',
				result: 'ok',
				notification: [`Vous avez supprimé ${friend.username} de vos amis`],
			} as res_remove_friend));
			return;
	}
}

export const acceptFriendRequest = async (ws: WebSocket, user: User, state: State, text: req_accept_friend) => {
	const { user_id } = text;
	if (!user_id) {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as res_accept_friend));
	}

	const relation = state.friends.find(friend =>
		(friend.user_one_id === user.id && friend.user_two_id === user_id) ||
		(friend.user_one_id === user_id && friend.user_two_id === user.id) || relation.status === '');
	if (!relation) {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as res_accept_friend));
		return;
	}

	switch (relation.status) {
		case 'friend':
			ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Vous êtes déjà amis'] } as res_accept_friend));
			return;
		case 'blocked':
			if (relation.target === user.id) {
				ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Cet utilisateur vous a bloqué'] } as res_accept_friend));
			}
			else if (relation.target === user_id) {
				ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Vous avez déjà bloqué cet utilisateur'] } as res_accept_friend));
			}
			return;
		case 'pending':
			if (relation.target !== user.id) {
				ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Vous ne pouvez pas accepter cette demande d\'ami'] } as res_accept_friend));
				return;
			}
			else {
				const friend = state.user.get(user_id);
				let groupPrivMsg: Group | null = await modelsChat.createPrivateGroup(user, friend, state);
				if (groupPrivMsg == null) {
					ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Erreur lors de la création du groupe privé'] } as res_accept_friend));
					return;
				}
				if (await modelsFriends.updateFriendRelation(user, friend, 'friend', groupPrivMsg, state) == false) {
					ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: [`Erreur lors de l'acceptation de la demande d'ami`] } as res_accept_friend));
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
							online: friend.online
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
								email: user.email,
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
}

export default {
	getConnectedFriends,
	getFriends,
	buildFriendsMap,
	addFriendRequest,
	acceptFriendRequest,
	removeFriendRequest,
};