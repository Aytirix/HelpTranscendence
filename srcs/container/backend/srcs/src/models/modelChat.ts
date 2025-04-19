import { skGroup, Message, User } from '@types';
import executeReq from '@models/database';
import { WebSocketServer, WebSocket } from 'ws';
import { State } from '@typesChat';

async function getAllGroupsFromUser(userws: WebSocket, state: State) {
	const query = `SELECT * FROM groups WHERE id IN (SELECT group_id FROM group_users WHERE user_id = ?)`;
	const groups: any = await executeReq(query, [userws.user.id]);
	if (groups.length === 0) {
		return [];
	}

	await Promise.all(groups.map(async (group: any) => {
		const existingGroup = state.groups.find(g => g.id === group.id);
		if (existingGroup) {
			existingGroup.members.push(userws);
		} else {
			let grp = {
				id: group.id,
				name: group.name,
				members: [userws],
				messages: []
			};
			grp.messages = await getMessagesFromGroup(grp);
			state.groups.push(grp);
		}
	}));
}

async function getMessagesFromGroup(group: skGroup, limit: number = 20) {
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


async function newMessage(group: skGroup, user: User, message: string, sent_at: Date) {
	const query = `INSERT group_messages (group_id, sender_id, message, sent_at) VALUES (?, ?, ?, ?)`;
	let sentAtTimestamp = sent_at.getTime();
	console.log(sentAtTimestamp);
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