import { Group, Message, User } from '@types';
import executeReq from '@models/database';
import { WebSocketServer, WebSocket } from 'ws';

async function getAllGroupsFromUser(userws: WebSocket, list_groups: Group[]) {
	const query = `SELECT * FROM groups WHERE id IN (SELECT group_id FROM group_users WHERE user_id = ?)`;
	const groups: any = await executeReq(query, [userws.user.id]);
	if (groups.length === 0) {
		return [];
	}

	await Promise.all(groups.map(async (group: any) => {
		if (!list_groups.some(g => g.id === group.id)) {
			let grp = {
				id: group.id,
				name: group.name,
				members: [userws],
				messages: []
			};
			grp.messages = await getMessagesFromGroup(grp, 20);
			list_groups.push(grp);
		} else {
			const existingGroup = list_groups.find(g => g.id === group.id);
			if (existingGroup) {
				existingGroup.members.push(userws);
			}
		}
	}));

	return list_groups;
}


async function getMessagesFromGroup(group: Group, limit: number) {
	const id_first_message = group.messages.length > 0 ? group.messages[0].id : 0;
	const query = `SELECT * FROM group_messages WHERE group_id = ? AND id > ? ORDER BY id DESC LIMIT ?`;
	const messages: any = await executeReq(query, [group.id, id_first_message, limit]);
	if (messages.length === 0) {
		return [];
	}
	messages.map((message: any) => {
		const userws = group.members.find((userws: WebSocket) => userws.user.id === message.sender_id);
		if (userws) {
			group.messages.push({
				id: message.id,
				sender_id: userws.user.id,
				message: message.message,
				sent_at: message.sent_at,
			});
		}
	});
	return group.messages;
}

async function newMessage(group: Group, user: User, message: string) {
	const query = `INSERT group_messages (group_id, sender_id, message) VALUES (?, ?, ?)`;
	const result: any = await executeReq(query, [group.id, user.id, message]);

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