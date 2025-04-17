import { skGroup, User } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_connected } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import { IncomingMessage } from 'http';

export const init_connexion = async (ws: WebSocket, req: IncomingMessage, state: State) => {
	console.log('Nouvelle connexion de l\'utilisateur:', ws.user.id);
	if (!state.users_connected.some(userws => userws.user.id === ws.user.id)) {
		state.users_connected.push(ws);
		await modelsChat.getAllGroupsFromUser(ws, state);
		ws.user.friends = await modelsFriends.getAllFriendFromUser(ws.user);

		// Envoi de l'information de connexion à tous les amis connectés
		const friendsConnected = state.users_connected.filter((userws: WebSocket) => {
			return ws.user.friends.some(friend => friend.friend_id === userws.user.id && friend.friend_id !== ws.user.id);
		});

		friendsConnected.forEach((userws: WebSocket) => {
			const send: send_friend_connected = {
				action: 'friend_connected',
				user: ws.user,
			};
			userws.send(JSON.stringify(send));
		});

		// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
		const send: send_connected = {
			action: 'connected',
			user: ws.user,
			groups: state.groups.map(group => ({
				id: group.id,
				name: group.name,
				members: group.members.map(userws => userws.user),
				messages: group.messages,
			})),
			friends_connected: friendsConnected.map(userws => userws.user),
		};
		ws.send(JSON.stringify(send));
	}
};

export const newMessage = async (ws: WebSocket, sender: User, state: State, req: req_newMessage) => {
	const group = state.groups.find((group: skGroup) => group.id === req.group_id);
	if (!group) {
		ws.send(JSON.stringify({ action: 'error', message: 'Groupe non trouvé' }));
		return;
	}
	const user: WebSocket = group.members.find((userws: WebSocket) => userws.user.id === ws.user.id);
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
		console.log('Envoi du message à l\'utilisateur:', memberws.user.id);
		if (memberws.user.id !== ws.user.id) {
			const wsMember = state.users_connected.find((userws: WebSocket) => userws.user.id === memberws.user.id);
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