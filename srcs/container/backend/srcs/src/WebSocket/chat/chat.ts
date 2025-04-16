import { Group, Message, User } from '@types';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

let groups: Group[] = [];
let messages: Message[] = [];
let users: User[] = [];

export interface reponse {
	action: string;
	join: {
		group_id: number;
	}
}

async function chatWebSocket(wss: WebSocketServer, ws: WebSocket, req: IncomingMessage) {

	ws.on('message', (message: Buffer) => {
		var text: reponse | null = null;
		try {
			text = JSON.parse(message.toString().trim());
		} catch (e) {
			ws.send('Veuillez envoyer un message valide au format JSON.');
			return;
		}

		const action = text.action;
		if (!action) {
			ws.send('Veuillez spécifier une action');
			return;
		}

		switch (action) {
			case 'join':
			default:
				ws.close(1008, 'Action non reconnue');
				break;
		}
		ws.send('Veuillez spécifier une action');
	});

	ws.on('close', () => {
		console.log('Connexion fermée');
	});

	ws.on('error', (error: Error) => {
		console.error('Erreur WebSocket:', error);
	});
	console.log('Connexion WebSocket établie pour l\'utilisateur');
}

export default chatWebSocket;