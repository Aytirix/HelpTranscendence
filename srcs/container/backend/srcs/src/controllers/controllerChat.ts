import { Group, Message, User } from '@types';
import { send_friend_connected, res_disconnect, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage, reponse } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import { IncomingMessage } from 'http';
import controllerFriends from './controllerFriends';
import { mapToObject } from '@tools';

/*
 * Vérifie si le groupe existe
 * @param wsSender WebSocket de l'utilisateur
 * @param state État de l'application
 * @param group_id ID du groupe à vérifier
 * @returns Le groupe si trouvé, sinon false
*/
export function groupExists(ws: WebSocket, state: State, group_id: number): Group | false {
	const group = state.groups.get(group_id);
	if (!group) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Groupe non trouvé'] } as reponse));
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
export function userInGroup(ws: WebSocket, user: User, group: Group): boolean {
	const res: boolean = group.members.some((member: User) => member.id === user.id);
	if (!res) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous n\'êtes pas membre de ce groupe'] } as reponse));
		return false;
	}
	return true;
}

export function broadcastAllGroupUsers(user: User, state: State, group: Group, text: unknown) {
	let send: number[] = [];
	for (const [, group] of state.groups) {
		const members = group.members.filter(member => member.id !== user.id);
		members.forEach(member => {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN && send.indexOf(member.id) === -1) {
				send.push(member.id);
				wsMember.send(text as string);
			}
		});
	}
}

export const addOnlineUser = (state: State, ws: WebSocket, user: User) => {
	if (!state.user.has(user.id)) {
		state.user.set(user.id, user);
	}
	state.onlineSockets.set(user.id, ws);
};

export const removeOnlineUser = (state: State, user: User) => {
	state.user.delete(user.id);
	state.onlineSockets.delete(user.id);

	state.user.forEach((user: User) => {
		if (!state.onlineSockets.has(user.id)) {
			state.user.delete(user.id);
		}
	}
	);
};

export const init_connexion = async (ws: WebSocket, user: User, state: State) => {
	console.log('Nouvelle connexion de l\'utilisateur:', user.id);
	addOnlineUser(state, ws, user);
	await modelsChat.getAllGroupsFromUser(user, state);

	// Envoi de l'information de connexion à tous les amis connectés
	const friends = await controllerFriends.getFriends(user.id, state);

	broadcastAllGroupUsers(user, state, null, JSON.stringify({ action: 'friend_connected', user_id: user.id } as send_friend_connected));

	// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
	const send: send_init_connected = {
		action: 'init_connected',
		result: 'ok',
		user: user,
		groups: mapToObject(state.groups),
		friends: friends,
	};
	ws.send(JSON.stringify(send));
};

export const user_disconnected = async (ws: WebSocket, user: User, state: State) => {
	console.log('Déconnexion de l\'utilisateur:', user.id);
	broadcastAllGroupUsers(user, state, null, JSON.stringify({ action: 'friend_disconnected', user_id: user.id } as res_disconnect));
	removeOnlineUser(state, user);
};

export const newMessage = async (ws: WebSocket, user: User, state: State, req: req_newMessage) => {
	const sentAtDate = new Date();
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, user, group)) return;

	// stockage du message dans la base de données
	if (!req.message) {
		ws.send(JSON.stringify({ action: 'new_message', result: 'error', notification: ['Message manquant'] } as res_newMessage));
		return;
	}

	if (req.message.length > 1000) {
		ws.send(JSON.stringify({ action: 'new_message', result: 'error', notification: ['Message trop long'] } as res_newMessage));
		return;
	}

	const newMessage = await modelsChat.newMessage(group, user, req.message, sentAtDate);
	if (!newMessage) {
		ws.send(JSON.stringify({ action: 'new_message', result: 'error', notification: ['Erreur lors de l\'envoi du message'] } as res_newMessage));
		return;
	}

	group.messages.push(newMessage);
	const messageToSend: res_newMessage = {
		action: 'new_message',
		result: 'ok',
		group_id: group.id,
		message: newMessage,
	};

	group.members.forEach((member: User) => {
		const wsMember = state.onlineSockets.get(member.id);
		if (wsMember && wsMember.readyState === WebSocket.OPEN) {
			wsMember.send(JSON.stringify(messageToSend));
		}
	});
};

export const loadMoreMessage = async (ws: WebSocket, user: User, state: State, req: req_loadMoreMessage) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, user, group)) return;

	if (req.firstMessageId < 0) {
		ws.send(JSON.stringify({ action: 'loadMoreMessage', result: 'error', notification: ['ID du message manquant'] } as res_loadMoreMessage));
		return;
	}

	let index = 0;

	if (req.firstMessageId > 0) {
		// verifier si le firstMessageId est dans le groupe
		index = group.messages.findIndex((message: Message) => message.id === req.firstMessageId);
		if (index === -1) {
			ws.send(JSON.stringify({ action: 'loadMoreMessage', result: 'error', notification: ['Message non trouvé'] } as res_loadMoreMessage));
			return;
		}
	}

	// voir combien il y a de message avant le lastMessage deja recuperer de la db
	const messagesToGet = group.messages.slice(0, index);
	let messages: any[] = [];
	if (messagesToGet.length >= 20) {
		messages = messagesToGet.slice(index + 1, index + 20);
	} else {
		const messagesFromDb = await modelsChat.getMessagesFromGroup(group, 20);
		messages = messagesToGet.concat(messagesFromDb);
	}
	ws.send(JSON.stringify({ action: 'loadMoreMessage', group_id: group.id, messages: messages } as res_loadMoreMessage));
}

export default {
	init_connexion,
	user_disconnected,
	newMessage,
	loadMoreMessage,
	addOnlineUser,
	removeOnlineUser,
};