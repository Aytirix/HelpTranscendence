import { Group, User } from '@types';
import { req_newMessage, res_newMessage, State } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/chat';
import modelsFriends from '@models/friends';
import { IncomingMessage } from 'http';

export const init_connexion = async (ws: WebSocket, req: IncomingMessage, state: State) => {
	console.log('Nouvelle connexion de l\'utilisateur:', ws.user.id);
	if (!state.users_connected.some(user => user.id === ws.user.id)) {
		state.users_connected.push(ws.user);
		state.groups = await modelsChat.getAllGroupsFromUser(ws, state.groups);
		ws.user.friends = await modelsFriends.getAllFriendFromUser(ws.user);
		ws.send(JSON.stringify({
			action: 'connected',
			user: ws.user,
			groups: state.groups,
			users_connected: state.users_connected,
		}));
	}
};

export const newMessage = async (ws: WebSocket, sender: User, state: State, req: req_newMessage) => {
	const group = state.groups.find((group: Group) => group.id === req.group_id);
	if (!group) {
		ws.send(JSON.stringify({ action: 'error', message: 'Groupe non trouvé' }));
		return;
	}
	const user: WebSocket= group.members.find((userws: WebSocket) => userws.user.id === ws.user.id);
	if (!user) {
		ws.send(JSON.stringify({ action: 'error', message: 'Utilisateur non trouvé dans le groupe' }));
		return;
	}

	const newMessage = await modelsChat.newMessage(group, ws.user, req.message);
	if (!newMessage) {
		ws.send(JSON.stringify({ action: 'error', message: 'Erreur lors de l\'envoi du message' }));
		return;
	}
	group.messages.push(newMessage);
	const messageToSend: res_newMessage = {
		action: 'new_message',
		group_id: group.id,
		message: newMessage,
	};
	group.members.forEach((memberws: WebSocket) => {
		if (memberws.user.id !== ws.user.id) {
			const wsMember = state.users_connected.find((user: User) => user.id === memberws.user.id);
			if (wsMember) {
				memberws.send(JSON.stringify(messageToSend));
			}
		}
	});
};

export default {
	init_connexion,
	newMessage,
};