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
	const id_first_message = group.messages.length > 0 ? group.messages[0].id : 0;
	const query = `SELECT * FROM group_messages WHERE group_id = ? AND id > ? ORDER BY sent_at DESC LIMIT ?`;
	const messages: any = await executeReq(query, [group.id, id_first_message, limit]);
	if (messages.length === 0) {
		return [];
	}
	messages.map((message: any) => {
		group.messages.push({
			id: message.id,
			sender_id: message.sender_id,
			message: message.message,
			sent_at: message.sent_at,
		});
	});
	return group.messages;
}

async function newMessage(group: skGroup, user: User, message: string) {
	const query = `INSERT group_messages (group_id, sender_id, message, sent_at) VALUES (?, ?, ?, ?)`;
	let sentAtTimestamp = new Date().toISOString();
	sentAtTimestamp = sentAtTimestamp.slice(0, 23).replace('T', ' ');
	const result: any = await executeReq(query, [group.id, user.id, message, sentAtTimestamp]);

	if (result.affectedRows === 0) {
		return null;
	}

	const res: Message = {
		id: result.insertId,
		sender_id: user.id,
		message: message,
		sent_at: new Date(),
	};
	return res;
}

export default {
	getAllGroupsFromUser,
	getMessagesFromGroup,
	newMessage,
}