import { Group, Message, User } from '@types';
import executeReq from '@models/database';
import { State } from '@typesChat';

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
				messages: [],
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

async function getMessagesFromGroup(group: Group, limit: number = 20) {
	const firstMessageId = group.messages.length > 0 ? group.messages[0].id : null;

	const sql = `
	  SELECT id, sender_id, message, sent_at
	  FROM (
		SELECT *
		FROM group_messages
		WHERE group_id = ?
		  ${firstMessageId ? 'AND id < ?' : ''}
		ORDER BY sent_at DESC
		LIMIT ?
	  ) AS sub
	  ORDER BY sent_at ASC
	`;

	const params = firstMessageId
		? [group.id, firstMessageId, limit]
		: [group.id, limit];

	const rows: any =
		await executeReq(sql, params);

	if (rows.length === 0) {
		return [];
	}

	const newMessages: Message[] = rows.map(r => ({
		id: r.id,
		sender_id: r.sender_id,
		message: r.message,
		sent_at: new Date(r.sent_at),
	}));

	group.messages = [...newMessages, ...group.messages];

	return newMessages;
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

export default {
	getAllGroupsFromUser,
	getMessagesFromGroup,
	newMessage,
}