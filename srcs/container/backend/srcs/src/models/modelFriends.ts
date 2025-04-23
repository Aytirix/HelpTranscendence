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

async function getFriendsForUser(userId: number, state: State): Promise<User[]> {
	const query = `
		SELECT u.id, u.email, u.username, u.avatar, u.lang, f.groupe_priv_msg_id 
		FROM friends f 
		JOIN users u 
			ON u.id = CASE 
						WHEN f.user_one_id = ? THEN f.user_two_id 
						ELSE f.user_one_id 
					END 
		WHERE f.user_one_id = ? OR f.user_two_id = ?;
	`;

	const result: any = await executeReq(query, [userId, userId, userId]);

	if (result.length === 0) return [];

	const fullFriends = result.map((friend: any) => ({
		id: friend.id,
		email: friend.email,
		username: friend.username,
		avatar: friend.avatar,
		lang: friend.lang,
		privmsg_id: friend.groupe_priv_msg_id,
	}));

	for (const { privmsg_id, ...userWithoutPrivmsg } of fullFriends) {
		if (!state.user.has(userWithoutPrivmsg.id))
			state.user.set(userWithoutPrivmsg.id, {
				...userWithoutPrivmsg,
			});
	}


	return fullFriends;
}


export default {
	loadAllFriendRelationsFromDB,
	getFriendsForUser,
}