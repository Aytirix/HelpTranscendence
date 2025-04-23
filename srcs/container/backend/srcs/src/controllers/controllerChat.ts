import { Group, Message, User } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import { IncomingMessage } from 'http';
import controllerFriends from './controllerFriends';

/*
 * Vérifie si le groupe existe
 * @param wsSender WebSocket de l'utilisateur
 * @param state État de l'application
 * @param group_id ID du groupe à vérifier
 * @returns Le groupe si trouvé, sinon false
*/
export function groupExists(ws: WebSocket, state: State, group_id: number): Group | false {
	const group = state.groups.find((group: Group) => group.id === group_id);
	if (!group) {
		ws.send(JSON.stringify({ action: 'error', message: 'Groupe non trouvé' }));
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
		ws.send(JSON.stringify({ action: 'error', message: 'Vous n\'êtes pas membre de ce groupe' }));
		return false;
	}
	return true;
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

	// Parcourir la liste des utilisateurs connectés et verifier si'il ont un lien avec un utilisateur encore connecté, si non, on le supprime
	state.user.forEach((user: User) => {
		const friendsIds = state.friendsByUser.get(user.id) || [];
		const hasFriendConnected = friendsIds.some(friendId => state.onlineSockets.has(friendId));
		if (!hasFriendConnected) {
			state.user.delete(user.id);
			state.onlineSockets.delete(user.id);
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

	friends.forEach((friend: User) => {
		const userws = state.onlineSockets.get(friend.id);
		if (!userws) return;
		const send: send_friend_connected = {
			action: 'friend_connected',
			userId: user.id,
		};
		userws.send(JSON.stringify(send));
	});

	// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
	const send: send_init_connected = {
		action: 'init_connected',
		user: user,
		groups: state.groups.map(group => (
			{
				id: group.id,
				name: group.name,
				members: group.members,
				owners_id: group.owners_id,
				onlines_id: group.onlines_id,
				messages: group.messages.slice(-20),
				private: group.private,
			})),
		friends: friends,
	};
	ws.send(JSON.stringify(send));
};

export const user_disconnected = async (ws: WebSocket, user: User, state: State) => {
	console.log('Déconnexion de l\'utilisateur:', user.id);

	for (const group of state.groups) {
		group.members = group.members.filter(member => member.id !== user.id);
		group.members.forEach(member => {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN) {
				wsMember.send(JSON.stringify({
					action: 'user_disconnected',
					user: user.id,
				}));
			}
		});
	}
	removeOnlineUser(state, user);
};


export const newMessage = async (ws: WebSocket, user: User, state: State, req: req_newMessage) => {
	const sentAtDate = new Date();
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, user, group)) return;

	// stockage du message dans la base de données
	if (!req.message) {
		ws.send(JSON.stringify({ action: 'error', message: 'Message manquant' }));
		return;
	}

	if (req.message.length > 1000) {
		ws.send(JSON.stringify({ action: 'error', message: 'Message trop long' }));
		return;
	}

	const newMessage = await modelsChat.newMessage(group, user, req.message, sentAtDate);
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
		ws.send(JSON.stringify({ action: 'error', message: 'ID du message manquant' }));
		return;
	}

	let index = 0;

	if (req.firstMessageId > 0) {
		// verifier si le firstMessageId est dans le groupe
		index = group.messages.findIndex((message: Message) => message.id === req.firstMessageId);
		if (index === -1) {
			ws.send(JSON.stringify({ action: 'error', message: 'Message non trouvé' }));
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
	const send: res_loadMoreMessage = {
		action: 'loadMoreMessage',
		group_id: group.id,
		messages: messages,
	};
	ws.send(JSON.stringify(send));
}

export default {
	init_connexion,
	user_disconnected,
	newMessage,
	loadMoreMessage,
	addOnlineUser,
	removeOnlineUser,
};