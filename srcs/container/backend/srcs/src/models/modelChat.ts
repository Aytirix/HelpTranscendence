import { Group, Message, User } from '@types';
import executeReq from '@models/database';
import { State } from '@typesChat';
import controllerFriends from '@controllers/controllerFriends';

async function getAllGroupsFromUser(user: User, state: State) {
	const query = `SELECT g.*, gu.owner FROM groups AS g JOIN group_users AS gu ON gu.group_id = g.id WHERE gu.user_id = ?`;
	const groups: any = await executeReq(query, [user.id]);
	if (groups.length === 0) {
		return [];
	}

	await Promise.all(groups.map(async (group: any) => {
		const existingGroup = state.groups.get(group.id);
		if (existingGroup) {
			if (!existingGroup.members.some((member: User) => member.id === user.id)) {
				existingGroup.members.push(user);
			}
			if (!existingGroup.onlines_id.includes(user.id)) {
				existingGroup.onlines_id.push(user.id);
			}
			if (group.owner === 1 && !existingGroup.owners_id.includes(user.id)) {
				existingGroup.owners_id.push(user.id);
			}
		} else {
			let grp: Group = {
				id: group.id,
				name: group.name,
				members: [],
				owners_id: user.id === group.owner ? [user.id] : [],
				onlines_id: [user.id],
				messages: new Map<number, Message>(),
				private: group.private,
			};
			await getAllUserFromGroup(grp);
			state.groups.set(grp.id, grp);
		}
	}));
}

async function getAllUserFromGroup(group: Group) {
	const query = `SELECT u.id, u.email, u.username, u.lang, u.avatar, gu.owner FROM users AS u JOIN group_users AS gu ON gu.user_id = u.id WHERE gu.group_id = ?`;
	const users: any = await executeReq(query, [group.id]);
	if (users.length === 0) {
		return [];
	}
	group.owners_id = [];
	group.members = users.map((user: any) => {
		if (user.owner === 1 && !group.owners_id.includes(user.id)) {
			group.owners_id.push(user.id);
		}
		return {
			id: user.id,
			email: user.email,
			username: user.username,
			lang: user.lang,
			avatar: user.avatar,
		};
	});
}

async function getMessagesFromGroup(
	group: Group,
	limit: number = 20,
	ignoreUserId: number[] = []
): Promise<Map<number, Message>> {
	let collected: Map<number, Message> = new Map();
	let allFetched: Map<number, Message> = new Map();
	let lastId = (group.messages && group.messages.size > 0) ? Math.min(...group.messages.keys()) : null;
	const batchSize = Math.max(limit * 2, 50);

	while (collected.size < limit) {
		const sql = `
		SELECT id, sender_id, message, sent_at
		FROM group_messages
		WHERE group_id = ?
		  ${lastId ? 'AND id < ?' : ''}
		ORDER BY sent_at DESC
		LIMIT ?
	  `;
		const params = lastId
			? [group.id, lastId, batchSize]
			: [group.id, batchSize];
		const rows = await executeReq(sql, params) as any[];

		if (rows.length === 0) {
			break;
		}

		for (const r of rows) {
			const msg: Message = {
				id: r.id,
				sender_id: r.sender_id,
				message: r.message,
				sent_at: new Date(r.sent_at),
			};
			allFetched.set(msg.id, msg);
			if (!ignoreUserId.includes(msg.sender_id) && collected.size < limit) {
				collected.set(msg.id, msg);
			}
		}
		lastId = rows[rows.length - 1].id;
	}
	// ajouter les messages dans le groupe
	for (const msg of allFetched.values()) {
		if (!group.messages.has(msg.id)) {
			group.messages.set(msg.id, msg);
		}
	}
	return collected;
}


async function newMessage(group: Group, user: User, message: string, sent_at: Date) {
	const query = `INSERT group_messages (group_id, sender_id, message, sent_at) VALUES (?, ?, ?, ?)`;
	let sentAtTimestamp = sent_at.getTime();
	const result: any = await executeReq(query, [group.id, user.id, message, sentAtTimestamp]);

	if (result.affectedRows === 0) {
		return null;
	}

	const res: Message = {
		id: result.insertId,
		sender_id: user.id,
		message: message,
		sent_at: new Date(sentAtTimestamp),
	};
	return res;
}

async function createPublicGroup(user: User, name: string, list_users: User[], state: State): Promise<Group | null> {
	const query2 = `INSERT INTO groups (name, private) VALUES (?, 0)`;
	const result2: any = await executeReq(query2, [name]);
	if (result2.affectedRows === 0) {
		return null;
	}
	const group: Group = {
		id: 0,
		name: name,
		members: [],
		owners_id: [],
		onlines_id: [],
		messages: new Map<number, Message>(),
		private: false,
	};
	group.id = result2.insertId;
	await addUserToGroup(group, user, state, true);
	for (const user of list_users) {
		if (! await addUserToGroup(group, user, state)) {
			await deleteGroup(group.id, state);
			return null;
		}
	}
	state.groups.set(group.id, group);
	return group;
}

async function addUserToGroup(group: Group, user: User, state: State, isOwner: boolean = false): Promise<boolean> {
	const query = `INSERT INTO group_users (group_id, user_id, owner) VALUES (?, ?, ?)`;
	const result: any = await executeReq(query, [group.id, user.id, isOwner ? 1 : 0]);
	if (result.affectedRows === 0) {
		return false;
	}
	if (!group.members.some((member: User) => member.id === user.id)) {
		group.members.push(user);
	}
	if (controllerFriends.userIsConnected(user, state) && !group.onlines_id.includes(user.id)) {
		group.onlines_id.push(user.id);
	}
	if (isOwner && !group.owners_id.includes(user.id)) {
		group.owners_id.push(user.id);
	}
	return true;
}

async function removeUserFromGroup(group: Group, user: User): Promise<boolean> {
	const query = `DELETE FROM group_users WHERE group_id = ? AND user_id = ?`;
	const result: any = await executeReq(query, [group.id, user.id]);
	if (result.affectedRows === 0) {
		return false;
	}
	group.members = group.members.filter((member: User) => member.id !== user.id);
	group.onlines_id = group.onlines_id.filter((id: number) => id !== user.id);
	group.owners_id = group.owners_id.filter((id: number) => id !== user.id);
	return true;
}

async function deleteGroup(group_id: number, state: State): Promise<boolean> {
	const query = `DELETE FROM groups WHERE id = ?`;
	const result: any = await executeReq(query, [group_id]);
	if (result.affectedRows === 0) {
		return false;
	}
	state.groups.delete(group_id);
	return true;
}

async function createPrivateGroup(user: User, friend: User, state: State): Promise<Group | null> {
	const query = `SELECT * FROM groups WHERE private = 1 AND id IN (SELECT group_id FROM group_users WHERE user_id IN (?, ?))`;
	const result: any = await executeReq(query, [user.id, friend.id]);
	if (result.length > 0) {
		const group = result[0];
		const groupId = group.id;
		const group2: Group = {
			id: group.id,
			name: group.name || '',
			members: [user, friend],
			owners_id: [user.id, friend.id],
			onlines_id: [user.id, ...(friend.online ? [friend.id] : [])],
			messages: new Map<number, Message>(),
			private: true,
		};
		state.groups.set(groupId, group2);
		return group2;
	}


	const query2 = `INSERT INTO groups (private) VALUES (1)`;
	const result2: any = await executeReq(query2);
	if (result2.affectedRows === 0) {
		return null;
	}
	const groupId = result2.insertId;
	const group: Group = {
		id: groupId,
		name: '',
		members: [],
		owners_id: [],
		onlines_id: [],
		messages: new Map<number, Message>(),
		private: true,
	};
	state.groups.set(groupId, group);
	if (! await addUserToGroup(group, user, state, true) || ! await addUserToGroup(group, friend, state, true)) {
		await deleteGroup(group.id, state);
		return null;
	}
	return group;
}

export default {
	getAllGroupsFromUser,
	getMessagesFromGroup,
	newMessage,
	createPublicGroup,
	addUserToGroup,
	removeUserFromGroup,
	deleteGroup,
	createPrivateGroup,
}