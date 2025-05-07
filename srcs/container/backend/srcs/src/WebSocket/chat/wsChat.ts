import { Friends, Group, User } from '@types';
import { State, request, req_loadMoreMessage, req_newMessage, res_pong, req_accept_friend, req_add_friend, req_remove_friend, req_refuse_friend, req_block_friend, req_createGroup, req_addUserGroup, req_leaveGroup } from '@typesChat';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import modelsFriends from '@models/modelFriends';
import controllersChat from '@controllers/controllerChat';
import controllerFriends from '@controllers/controllerFriends';
import { mapToObject } from '@tools';

const state: State = {
	user: new Map<number, User>(),
	onlineSockets: new Map<number, WebSocket>(),
	groups: new Map<number, Group>(),
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
		let text: request | null = null;
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
			case 'create_group':
				controllersChat.createGroup(ws, user, state, (text as req_createGroup));
				break;
			case 'add_user_to_group':
				controllersChat.addUserGroup(ws, user, state, (text as req_addUserGroup));
			case 'remove_user_from_group':
				controllersChat.removeUserGroup(ws, user, state, (text as req_addUserGroup));
				break;
			case 'leave_group':
				controllersChat.leaveGroup(ws, user, state, (text as req_leaveGroup));
				break;
			case 'delete_group':
				break;
			case 'add_friend':
				controllerFriends.addFriendRequest(ws, user, state, (text as req_add_friend));
				break;
			case 'remove_friend':
				controllerFriends.removeFriendRequest(ws, user, state, (text as req_remove_friend));
				break;
			case 'accept_friend':
				controllerFriends.acceptFriendRequest(ws, user, state, (text as req_accept_friend));
				break;
			case 'refuse_friend':
				controllerFriends.refuseFriendRequest(ws, user, state, (text as req_refuse_friend));
				break;
			case 'cancel_request':
				controllerFriends.cancelFriendRequest(ws, user, state, (text as req_refuse_friend));
				break;
			case 'block_user':
				controllerFriends.blockFriendRequest(ws, user, state, (text as req_block_friend));
				break;
			case 'unblock_user':
				controllerFriends.unBlockFriendRequest(ws, user, state, (text as req_block_friend));
				break;
			default:
				ws.send(/**1008,**/ 'Action non reconnue'); // to close
				break;
		}

		ws.send(JSON.stringify({
			action: 'state',
			state: {
				groups: mapToObject(state.groups),
				friends: state.friends,
				friendsByUser: mapToObject(state.friendsByUser),
				users_connected: mapToObject(state.user),
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
		controllersChat.removeOnlineUser(state, user);
		console.error('Erreur WebSocket:', error);
		if (ws.readyState === WebSocket.OPEN) {
			ws.close(1008, 'Erreur WebSocket');
		}
	});
}

export default chatWebSocket;
