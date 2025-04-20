import { User, Friends } from '@types';
import executeReq from '@models/database';
import { State } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';

async function loadAllFriendRelationsFromDB(): Promise<Friends[]> {
	const query = `SELECT * FROM friends`;
	const result: any = await executeReq(query);

	if (result.length === 0) return [];

	return result.map((friend: any) => ({
		id: friend.id,
		user_one_id: friend.user_one_id,
		user_two_id: friend.user_two_id,
		target: friend.target,
		status: friend.status,
	})) as Friends[];
}


export default {
	loadAllFriendRelationsFromDB,
}