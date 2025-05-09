import { Friends, Group, Message, User } from '@types';
import { send_friend_connected, res_disconnect, req_newMessage, res_newMessage, State, send_init_connected, req_loadMoreMessage, res_loadMoreMessage, reponse, req_createGroup, res_createGroup, req_addUserGroup, res_addUserGroup, req_leaveGroup, req_deleteGroup } from '@typesChat';
import { WebSocketServer, WebSocket } from 'ws';
import modelsChat from '@models/modelChat';
import modelsFriends from '@models/modelFriends';
import { IncomingMessage } from 'http';
import controllerFriends from './controllerFriends';
import { mapToObject } from '@tools';
import modelUser from '@models/modelUser';

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
export function userInGroup(ws: WebSocket, user: User, group: Group, send: boolean = true): boolean {
	const res: boolean = group.members.some((member: User) => member.id === user.id);
	if (!res) {
		if (send) ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous n\'êtes pas membre de ce groupe'] } as reponse));
		return false;
	}
	return true;
}

/*
 * Vérifie si l'utilisateur est owner du groupe
 * @param userws WebSocket de l'utilisateur
 * @param group Groupe à vérifier
 * @returns true si l'utilisateur est membre du groupe, false sinon
*/
export function userIsOwnerGroup(ws: WebSocket, user: User, group: Group): boolean {
	if (!userInGroup(ws, user, group)) return false;
	for (const owner_id of group.owners_id) {
		if (owner_id === user.id) {
			return true;
		}
	}
	ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous n\'êtes pas owner de ce groupe'] } as reponse));
	return false;
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
	const userToUpdate = state.user.get(user.id);
	if (userToUpdate) {
		userToUpdate.online = true;
	}
	state.onlineSockets.set(user.id, ws);
};

export const removeOnlineUser = (state: State, user: User) => {
	const userToUpdate = state.user.get(user.id);
	if (userToUpdate) {
		userToUpdate.online = false;
	}
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

	// recuprer les groupes de l'utilisateur
	const userGroups = new Map(
		Array.from(state.groups.entries()).filter(([_, group]: [number, Group]) => {
			let isFriend = false;
			for (const member of group.members) {
				if (member.id !== user.id) {
					const relation = controllerFriends.getRelationFriend(user.id, member.id, state);
					if (relation && relation.status === 'friend') isFriend = true;
					break;
				}
			}
			if (!group.private) return userInGroup(ws, user, group, false);
			if (group.private && isFriend) return userInGroup(ws, user, group, false);
			return false;
		})
	);

	// Envoi de la liste des groupes et utilisateurs connectés à l'utilisateur
	const send: send_init_connected = {
		action: 'init_connected',
		result: 'ok',
		user: { ...user },
		groups: mapToObject(userGroups),
		friends: friends.map(friend => ({ ...friend, email: undefined })), // Remove email from each friend
	};

	Object.values(send.groups).forEach(group => {
		group.members = group.members.map((member: User) => ({ ...member, email: undefined }));
	});
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
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Message manquant'] } as reponse));
		return;
	}

	if (req.message.length > 1000) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Message trop long'] } as reponse));
		return;
	}

	const newMessage = await modelsChat.newMessage(group, user, req.message, sentAtDate);
	if (!newMessage) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Erreur lors de l\'envoi du message'] } as reponse));
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
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['ID du message manquant'] } as reponse));
		return;
	}

	let index = 0;

	if (req.firstMessageId > 0) {
		// verifier si le firstMessageId est dans le groupe
		index = group.messages.findIndex((message: Message) => message.id === req.firstMessageId);
		if (index === -1) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Message non trouvé'] } as reponse));
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
	ws.send(JSON.stringify({ action: 'loadMoreMessage', result: 'ok', group_id: group.id, messages: messages } as res_loadMoreMessage));
}

export const createGroup = async (ws: WebSocket, user: User, state: State, req: req_createGroup) => {
	if (!req.group_name) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Nom de groupe manquant ou trop long'] } as reponse));
		return;
	}
	if (req.group_name.length > 25) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Nom de groupe trop long, 25 caractères maximum'] } as reponse));
		return;
	}
	if (req.users_id.length < 1) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous devez ajouter au moins un utilisateur au groupe'] } as reponse));
		return;
	}
	req.users_id = req.users_id.filter((id: number) => id !== user.id);
	const users: User[] = [];
	for (const userId of req.users_id) {
		const userToAdd = state.user.get(userId) || await modelUser.getUserById(userId);
		if (!userToAdd) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Utilisateur non trouvé'] } as reponse));
			return;
		}
		let relation: Friends | undefined;
		state.friends.forEach(friend => {
			if ((friend.user_one_id === user.id && friend.user_two_id === userId) ||
				(friend.user_one_id === userId && friend.user_two_id === user.id)) {
				relation = friend;
			}
		});
		if (!relation || relation.status !== 'blocked') {
			users.push(userToAdd);
		}
	}
	const group = await modelsChat.createPublicGroup(user, req.group_name, users, state);
	if (!group) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Erreur lors de la création du groupe'] } as reponse));
		return;
	}
	group.members.push(user);
	ws.send(JSON.stringify({ action: 'create_group', result: 'ok', group: group, notification: [`Vous avez créé le groupe ${group.name}`] } as res_createGroup));
	for (const user of users) {
		const wsMember = state.onlineSockets.get(user.id);
		if (wsMember && wsMember.readyState === WebSocket.OPEN) {
			wsMember.send(JSON.stringify({ action: 'create_group', result: 'ok', group: group, notification: [`${user.username} vous a ajouté au groupe ${group.name}`] } as res_createGroup));
		}
	}
}

export const addUserGroup = async (ws: WebSocket, user: User, state: State, req: req_addUserGroup) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userIsOwnerGroup(ws, user, group)) return;

	if (group.private) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous ne pouvez pas ajouter d\'utilisateur à un groupe privé'] } as reponse));
		return;
	}

	if (!req.user_id) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['ID de l\'utilisateur manquant'] } as reponse));
		return;
	}

	const userToAdd = state.user.get(req.user_id) || await modelUser.getUserById(req.user_id);
	if (!userToAdd) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Utilisateur non trouvé'] } as reponse));
		return;
	}

	if (controllerFriends.userIsBlocked(ws, user, userToAdd, state, true)) return;

	const added = await modelsChat.addUserToGroup(group, userToAdd, false);
	if (!added) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de l\'ajout de l\'utilisateur ${userToAdd.username} au groupe`] } as reponse));
		return;
	}
	ws.send(JSON.stringify({ action: 'add_user_group', result: 'ok', group_id: group.id, users_id: userToAdd.id, notification: [`Vous avez ajouté ${userToAdd.username} au groupe ${group.name}`] } as res_addUserGroup));

	// Envoi de la notification à tout les membres du groupe sauf l'utilisateur qui a ajouté
	group.members.forEach((member: User) => {
		if (member.id !== userToAdd.id && member.id !== user.id) {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN) {
				wsMember.send(JSON.stringify({ action: 'add_user_group', result: 'ok', group_id: group.id, users_id: userToAdd.id, notification: [`${user.username} a été ajouté au groupe ${group.name}`] } as res_addUserGroup));
			}
		}
	});

	const wsMember = state.onlineSockets.get(userToAdd.id);
	if (wsMember && wsMember.readyState === WebSocket.OPEN) {
		wsMember.send(JSON.stringify({ action: 'create_group', result: 'ok', group: group, notification: [`${user.username} vous a ajouté au groupe ${group.name}`] } as res_createGroup));
	}
}

export const removeUserGroup = async (ws: WebSocket, user: User, state: State, req: req_addUserGroup) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userIsOwnerGroup(ws, user, group)) return;

	if (!req.user_id) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['ID de l\'utilisateur manquant'] } as reponse));
		return;
	}
	const userToRemove = state.user.get(req.user_id) || await modelUser.getUserById(req.user_id);
	if (!userToRemove) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Utilisateur non trouvé'] } as reponse));
		return;
	}
	const added = await modelsChat.removeUserFromGroup(group, userToRemove);
	if (!added) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur lors de la suppresion de l\'utilisateur ${userToRemove.username} au groupe ${group.name}`] } as reponse));
		return;
	}
	ws.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: userToRemove.id, notification: [`Vous avez supprimé ${userToRemove.username} du groupe ${group.name}`] } as res_addUserGroup));

	// Envoi de la notification à tout les membres du groupe sauf l'utilisateur qui a ajouté
	group.members.forEach((member: User) => {
		if (member.id !== userToRemove.id && member.id !== user.id) {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN) {
				wsMember.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: userToRemove.id, notification: [`${user.username} a été supprimé  du groupe ${group.name}`] } as res_addUserGroup));
			}
		}
	});

	const wsMember = state.onlineSockets.get(userToRemove.id);
	if (wsMember && wsMember.readyState === WebSocket.OPEN) {
		wsMember.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: userToRemove.id, notification: [`${user.username} vous a supprimé du groupe ${group.name}`] } as res_addUserGroup));
	}
}

export const leaveGroup = async (ws: WebSocket, user: User, state: State, req: req_leaveGroup) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userInGroup(ws, user, group)) return;

	const added = await modelsChat.removeUserFromGroup(group, user);
	if (!added) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur pour vous retirer du groupe ${group.name}`] } as reponse));
		return;
	}
	ws.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: user.id, notification: [`Vous avez quitté le groupe ${group.name}`] } as res_addUserGroup));

	group.members.forEach((member: User) => {
		if (member.id !== user.id) {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN) {
				wsMember.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: user.id, notification: [`${user.username} a quitté le groupe ${group.name}`] } as res_addUserGroup));
			}
		}
	});
}

export const deleteGroup = async (ws: WebSocket, user: User, state: State, req: req_deleteGroup) => {
	const group = groupExists(ws, state, req.group_id);
	if (!group) return;

	if (!userIsOwnerGroup(ws, user, group)) return;

	if (group.private) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous ne pouvez pas supprimer un groupe privé'] } as reponse));
		return;
	}

	const del = await modelsChat.deleteGroup(group.id, state);
	if (!del) {
		ws.send(JSON.stringify({ action: 'error', result: 'error', notification: [`Erreur pour supprimer le groupe ${group.name}`] } as reponse));
		return;
	}
	ws.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: user.id, notification: [`Le groupe ${group.name} a été supprimé`] } as res_addUserGroup));

	group.members.forEach((member: User) => {
		if (member.id !== user.id) {
			const wsMember = state.onlineSockets.get(member.id);
			if (wsMember && wsMember.readyState === WebSocket.OPEN) {
				wsMember.send(JSON.stringify({ action: 'remove_user_group', result: 'ok', group_id: group.id, users_id: user.id, notification: [`${user.username} a supprimé le groupe ${group.name}`] } as res_addUserGroup));
			}
		}
	});
}

export default {
	init_connexion,
	user_disconnected,
	newMessage,
	loadMoreMessage,
	addOnlineUser,
	removeOnlineUser,
	createGroup,
	addUserGroup,
	removeUserGroup,
	leaveGroup,
	deleteGroup,
};