import { skGroup, User } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_getMessage, res_getMessage } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import { IncomingMessage } from 'http';

/*
 * Vérifie si le groupe existe
 * @param wsSender WebSocket de l'utilisateur
 * @param state État de l'application
 * @param group_id ID du groupe à vérifier
 * @returns Le groupe si trouvé, sinon false
*/
export function groupExists(wsSender: WebSocket, state: State, group_id: number): skGroup | false {
	const group = state.groups.find((group: skGroup) => group.id === group_id);
	if (!group) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Groupe non trouvé' }));
		return false;
	}
	return group;
}

/*
 * Vérifie si l'utilisateur est membre du groupe
 * @param userws WebSocket de l'utilisateur
 * @param group Groupe à vérifier
 * @returns true si l'utilisateur est membre du groupe, false sinon
*/
export function userInGroup(userws: WebSocket, group: skGroup): boolean {
	const res: boolean = group.members.some((userGroupws: WebSocket) => userGroupws.user.id === userws.user.id);
	if (!res) {
		userws.send(JSON.stringify({ action: 'error', message: 'Vous n\'êtes pas membre de ce groupe' }));
		return false;
	}
	return true;
}

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
		const send: send_init_connected = {
			action: 'init_connected',
			user: ws.user,
			groups: state.groups.map(group => (
				{
					id: group.id,
					name: group.name,
					members: group.members.map(userws => userws.user),
					messages: group.messages.slice(-20),
				})),
			friends_connected: friendsConnected.map(userws => userws.user),
		};
		ws.send(JSON.stringify(send));
	}
};

export const newMessage = async (wsSender: WebSocket, state: State, req: req_newMessage) => {
	const group = groupExists(wsSender, state, req.group_id);
	if (!group) return;

	if (!userInGroup(wsSender, group)) return;

	// stockage du message dans la base de données
	const newMessage = await modelsChat.newMessage(group, wsSender.user, req.message);
	if (!newMessage) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Erreur lors de l\'envoi du message' }));
		return;
	}

	group.messages.push(newMessage);
	const messageToSend: res_newMessage = {
		action: 'new_message',
		group_id: group.id,
		message: newMessage,
	};
	group.members.forEach((memberws: WebSocket) => {
		if (memberws.user.id !== wsSender.user.id) {
			const wsMember = state.users_connected.find((userws: WebSocket) => userws.user.id === memberws.user.id);
			if (wsMember) {
				memberws.send(JSON.stringify(messageToSend));
			}
		}
	});
};

export const getMessage = async (ws: WebSocket, state: State, req: req_getMessage) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, group)) return;

	if (!req.last_message_id) {
		ws.send(JSON.stringify({ action: 'error', message: 'ID du message manquant' }));
		return;
	}

	// verifier si le last_message_id est dans le groupe
	const lastMessage = group.messages.find((message: any) => message.id === req.last_message_id);
	if (!lastMessage) {
		ws.send(JSON.stringify({ action: 'error', message: 'Message non trouvé' }));
		return;
	}

	// voir combien il y a de message apres le lastMessage deja recuperer de la db
	const index = group.messages.indexOf(lastMessage);
	const messagesToGet = group.messages.slice(index + 1);
	let messages: any[] = [];
	if (messagesToGet.length >= 20) {
		messages = messagesToGet.slice(index + 1, index + 20);
	} else {
		// on va chercher les messages dans la db jusqu'a 20 messages
		const limit = 20 - messagesToGet.length;
		const messagesFromDb = await modelsChat.getMessagesFromGroup(group, limit);
		messages = messagesToGet.concat(messagesFromDb);
	}
	if (messages.length === 0) {
		ws.send(JSON.stringify({ action: 'error', message: 'Aucun message trouvé' }));
		return;
	}
	const send: res_getMessage = {
		action: 'get_message',
		group_id: group.id,
		messages: messages,
	};
	ws.send(JSON.stringify(send));
}

export default {
	init_connexion,
	newMessage,
	getMessage,
};