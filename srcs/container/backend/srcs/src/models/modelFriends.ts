import { User, Friends } from '@types';
import executeReq from '@models/database';

async function getAllFriendFromUser(user: User) {
	const query = `SELECT * FROM friends WHERE user_one_id = ? OR user_two_id = ?`;
	const friends: any = await executeReq(query, [user.id, user.id]);
	if (friends.length === 0) {
		return [];
	}

	const list_friends: Friends[] = [];

	await Promise.all(friends.map(async (friend: any) => {
		list_friends.push({
			id: friend.id,
			friend_id: friend.user_one_id === user.id ? friend.user_two_id : friend.user_one_id,
			target: friend.target,
			status: friend.status,
		});
	}));
	return list_friends;
}

export default {
	getAllFriendFromUser,
}