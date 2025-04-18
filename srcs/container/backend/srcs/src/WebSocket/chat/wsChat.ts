import { skGroup, User } from '@types';
import { State, reponse, req_newMessage } from '@typesChat';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import controllersChat from '@controllers/controllerChat';

const state: State = {
	groups: [] as skGroup[],
	users_connected: [] as WebSocket[],
}

async function chatWebSocket(wss: WebSocketServer, ws: WebSocket, req: IncomingMessage): Promise<void> {
	controllersChat.init_connexion(ws, req, state);
	ws.on('message', (message: Buffer) => {
		var text: reponse | null = null;
		try {
			text = JSON.parse(message.toString().trim());
		} catch (e) {
			ws.send(/**1008,**/ 'Veuillez envoyer un message au format JSON');
			return;
		}

		const action = text.action;
		if (!action) {
			ws.send('Veuillez spécifier une action');
			return;
		}

		console.log('Message reçu:', message.toString().trim());

		switch (action) {
			case 'ping':
				ws.send(JSON.stringify({ action: 'pong' }));
				break;
			case 'new_message':
				controllersChat.newMessage(ws, state, (text as req_newMessage));
				break;
			case 'get_message':
					controllersChat.newMessage(ws, state, (text as req_newMessage));
					break;
			default:
				ws.send(/**1008,**/ 'Action non reconnue');
				break;
		}
		ws.send(JSON.stringify({
			action: 'state',
			groups: state.groups.map(group => ({
				id: group.id,
				name: group.name,
				members: group.members.map(userws => userws.user),
				messages: group.messages,
			})),
			users_connected: state.users_connected.map(userws => userws.user),
		}));
	});

	ws.on('close', () => {
		console.log('Déconnexion de l\'utilisateur:', ws.user?.id);
		state.users_connected = state.users_connected.filter(userws => userws.user.id !== ws.user?.id);
		state.groups = state.groups.map(group => {
			group.members = group.members.filter(userws => userws.user.id !== ws.user?.id);
			group.members.forEach(member => {
				if (member.readyState === WebSocket.OPEN) {
					member.send(JSON.stringify({
						action: 'user_disconnected',
						user: ws.user.id
					}));
				}
			});
			return group;
		}
		);
		// state.groups = state.groups.filter(group => group.members.length > 0);
		ws.send('Vous avez été déconnecté.');
	});

	ws.on('error', (error: Error) => {
		state.users_connected = state.users_connected.filter(user => ws.user.id !== (ws as any).user?.id);
		console.error('Erreur WebSocket:', error);
		if (ws.readyState === WebSocket.OPEN) {
			ws.close(1008, 'Erreur WebSocket');
		}
	});
}

export default chatWebSocket;