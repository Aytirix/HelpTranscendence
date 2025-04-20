import { Message, Group, User, Friends } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage } from '@typesChat';
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

export function getFriends(userId: number, state: State): User[] {
	const friendsIds = state.friendsByUser.get(userId) || [];

	return friendsIds
		.map(friendId => state.user.get(friendId))
		.filter((user): user is User => user !== undefined);
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


export default {
	getConnectedFriends,
	getFriends,
	buildFriendsMap,
};