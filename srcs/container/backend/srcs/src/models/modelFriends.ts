import { User, Friends, Group } from '@types';
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
		SELECT u.id, u.email, u.username, u.avatar, u.lang, f.groupe_priv_msg_id, f.target, f.status
		FROM friends f 
		JOIN users u
			ON u.id = CASE 
						WHEN f.user_one_id = ? THEN f.user_two_id 
						ELSE f.user_one_id 
					END 
		WHERE (f.user_one_id = ? OR f.user_two_id = ?) AND f.status != '';
	`;

	const result: any = await executeReq(query, [userId, userId, userId]);

	if (result.length === 0) return [];

	const fullFriends = result.map((friend: any) => ({
		id: friend.id,
		email: friend.email,
		username: friend.username,
		avatar: friend.avatar,
		lang: friend.lang,
		relation: {
			status: friend.status,
			target: friend.target,
			privmsg_id: friend.groupe_priv_msg_id,
		},
	} as User));

	for (const { relation, ...userWithoutRelation } of fullFriends) {
		if (!state.user.has(userWithoutRelation.id))
			state.user.set(userWithoutRelation.id, {
				...userWithoutRelation,
			});
	}


	return fullFriends;
}

async function updateFriendRelation(user: User, friend: User, status: 'friend' | 'blocked' | 'pending' | '', group_id: number | false = null, state: State): Promise<boolean> {
	const [user_one_id, user_two_id] = user.id < friend.id ? [user.id, friend.id] : [friend.id, user.id];
	const query = `
		INSERT INTO friends (target, user_one_id, user_two_id, status, groupe_priv_msg_id ) VALUES (null, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE status = VALUES(status)${group_id !== false ? ', groupe_priv_msg_id = VALUES(groupe_priv_msg_id)' : ''};
	`;
	const result: any = await executeReq(query, [user_one_id, user_two_id, status, group_id !== false ? group_id : null]);

	if (result.affectedRows === 0) return false;
	// mettre à jour la relation dans le state
	// Ajouter le friends dans user
	if (!state.user.has(friend.id)) {
		state.user.set(friend.id, user);
	}
	const indexRelation = state.friends.findIndex(friend => (friend.user_one_id === user.id && friend.user_two_id === friend.id) || (friend.user_one_id === friend.id && friend.user_two_id === user.id));
	if (indexRelation !== -1) {
		state.friends[indexRelation].status = status;
	}
	else {
		state.friends.push({
			id: result.insertId,
			user_one_id,
			user_two_id,
			target: friend.id,
			group_id: group_id !== false ? group_id : null,
			status,
		});
	}
	return true;
}

export default {
	loadAllFriendRelationsFromDB,
	getFriendsForUser,
	updateFriendRelation,
}