import { Friends, Group, User } from '@types';
import { State, reponse, req_loadMoreMessage, req_newMessage, res_pong } from '@typesChat';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import controllersChat, { removeOnlineUser } from '@controllers/controllerChat';
import controllerFriends from '@controllers/controllerFriends';

const state: State = {
	user: new Map<number, User>(),
	onlineSockets: new Map<number, WebSocket>(),
	groups: [] as Group[],
	friends: [] as Friends[],
	friendsByUser: new Map<number, number[]>(),
};

(async () => {
	state.friends = await modelsFriends.loadAllFriendRelationsFromDB();
	state.friendsByUser = controllerFriends.buildFriendsMap(state.friends);
})();

async function chatWebSocket(wss: WebSocketServer, ws: WebSocket, user: User, req: IncomingMessage): Promise<void> {
	controllersChat.init_connexion(ws, user, state);
	ws.on('message', (message: Buffer) => {
		let text: reponse | null = null;
		try {
			text = JSON.parse(message.toString().trim());
		} catch (e) {
			ws.send(/**1008,**/ 'Veuillez envoyer un message au format JSON'); // to close
			return true;
		}

		const action = text.action;
		if (!action) {
			ws.send('Veuillez spécifier une action'); // to close
			return true;
		}

		switch (action) {
			case 'ping':
				const pong: res_pong = {
					action: 'pong'
				};
				ws.send(JSON.stringify(pong));
				break;
			case 'new_message':
				controllersChat.newMessage(ws, user, state, (text as req_newMessage));
				break;
			case 'loadMoreMessage':
				controllersChat.loadMoreMessage(ws, user, state, (text as req_loadMoreMessage));
				break;
			default:
				ws.send(/**1008,**/ 'Action non reconnue'); // to close
				break;
		}
		ws.send(JSON.stringify({
			action: 'state',
			state: {
				groups: state.groups,
				friends: state.friends,
				friendsByUser: state.friendsByUser,
				users_connected: state.user,
				user: user,
				lenOnlineSockets: state.onlineSockets.size,
			}
		}));
	});

	ws.on('close', () => {
		console.log('Déconnexion de l\'utilisateur:', user?.id);
		controllersChat.user_disconnected(ws, user, state);
	});

	ws.on('error', (error: Error) => {
		removeOnlineUser(state, user);
		console.error('Erreur WebSocket:', error);
		if (ws.readyState === WebSocket.OPEN) {
			ws.close(1008, 'Erreur WebSocket');
		}
	});
}

export default chatWebSocket;