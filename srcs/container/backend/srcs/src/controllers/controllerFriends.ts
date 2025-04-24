import { Message, Group, User, Friends } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage, req_accept_friend, res_accept_friend } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
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

export const acceptFriendRequest = async (ws: WebSocket, user: User, state: State, text: req_accept_friend) => {
	const { user_id } = text;
	if (!user_id) {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Veuillez spécifier un id d\'utilisateur'] } as res_accept_friend));
	}

	const indexRelation = state.friends.findIndex(friend => (friend.user_one_id === user.id && friend.user_two_id === user_id) || (friend.user_one_id === user_id && friend.user_two_id === user.id));
	if (!state.friends[indexRelation]) {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Cet utilisateur n\'a pas de lien avec vous'] } as res_accept_friend));
		return;
	}

	if (state.friends[indexRelation].status === 'friend') {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Vous êtes déjà amis'] } as res_accept_friend));
		return;
	}

	if (state.friends[indexRelation].status === 'blocked' && state.friends[indexRelation].target === user.id) {
		ws.send(JSON.stringify({ action: 'accept_friend', result: 'error', notification: ['Cet utilisateur vous a bloqué'] } as res_accept_friend));
		return;
	}

	if (state.friends[indexRelation].status === 'pending' && state.friends[indexRelation].target === user.id) {
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
		state.friends[indexRelation].status = 'friend';
		const friends = getConnectedFriends(user.id, state);
		if (friend) {
			ws.send(JSON.stringify({
				action: 'accept_friend',
				result: 'ok',
				user: {
					id: friend.id,
					username: friend.username,
					email: friend.email,
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
						username: user.username,
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

export default {
	getConnectedFriends,
	getFriends,
	buildFriendsMap,
	acceptFriendRequest,
};