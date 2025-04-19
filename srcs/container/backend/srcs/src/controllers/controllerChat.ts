import { Message, skGroup, User } from '@types';
import { send_friend_connected, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage } from '@typesChat';
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
	if (!req.message) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Message manquant' }));
		return;
	}

	if (!req.sent_at) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Date d\'envoi manquante' }));
		return;
	}

	if (req.message.length > 1000) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Message trop long' }));
		return;
	}

	//Si la difference entre la date d'envoi et la date actuelle est superieur a 1 saeconde
	const currentDate = new Date();
	const sentAtDate = new Date(req.sent_at);
	const diff = Math.abs(currentDate.getTime() - sentAtDate.getTime());
	console.log(`diff new message (en ms): ${diff}`);
	if (diff > 1000) {
		wsSender.send(JSON.stringify({ action: 'error', message: 'Date d\'envoi invalide' }));
		return;
	}

	const newMessage = await modelsChat.newMessage(group, wsSender.user, req.message, sentAtDate);
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

export const loadMoreMessage = async (ws: WebSocket, state: State, req: req_loadMoreMessage) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, group)) return;

	if (!req.firstMessageId) {
		ws.send(JSON.stringify({ action: 'error', message: 'ID du message manquant' }));
		return;
	}

	// verifier si le firstMessageId est dans le groupe
	const index = group.messages.findIndex((message: Message) => message.id === req.firstMessageId);
	if (index === -1) {
		ws.send(JSON.stringify({ action: 'error', message: 'Message non trouvé' }));
		return;
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
	newMessage,
	loadMoreMessage: loadMoreMessage,
};