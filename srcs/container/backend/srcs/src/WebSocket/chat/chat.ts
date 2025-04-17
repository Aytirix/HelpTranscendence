import { Group, User } from '@types';
import { State, reponse, req_newMessage } from '@typesChat';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/chat';
import modelsFriends from '@models/friends';
import controllersChat from '@controllers/chat';

let state: State = {
	groups: [] as Group[],
	users_connected: [] as User[],
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
				controllersChat.newMessage(ws, ws.user, state, (text as req_newMessage));
				break;
			default:
				ws.send(/**1008,**/ 'Action non reconnue');
				break;
		}
		ws.send(JSON.stringify({
			action: 'state',
			groups: state.groups,
			users_connected: state.users_connected,
		}));
	});

	ws.on('close', () => {
		console.log('Déconnexion de l\'utilisateur:', ws.user?.id);
		state.users_connected = state.users_connected.filter(user => user.id !== (ws as any).user?.id);
		state.groups = state.groups.map(group => {
			group.members = group.members.filter(user => ws.user.id !== (ws as any).user?.id);
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