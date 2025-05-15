import { WebSocket, RawData } from 'ws'
import { User } from '@types'
import { player } from "@Pacman/TypesPacman";
import StateManager from './game/StateManager';
import { request } from '@typesChat';

(async () => {
	StateManager.loopRooms();
})();

function sendResponse(ws: WebSocket, action: string, result: string, notification: string[], data: any = null): void {
	ws.send(JSON.stringify({ action, result, notification, data }));
}

function handleAddUser(ws: WebSocket, player: player): void {
	StateManager.addPlayer(ws, player);
}

function handleCreateRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.name) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un nom de salle']);
	if (StateManager.RoomManager.PlayerInRoom(player.id)) return sendResponse(ws, 'error', 'error', ['Vous êtes déjà dans une salle']);
	if (json.name.length < 3 || json.name.length > 15) return sendResponse(ws, 'error', 'error', ['Le nom de la salle doit faire entre 3 et 15 caractères']);
	if (StateManager.RoomManager.getRoomByName(json.name)) return sendResponse(ws, 'error', 'error', ['Le nom de la salle est déjà utilisé']);
	StateManager.RoomManager.createRoom(player, json.name);
}

function handleJoinRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.room_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un id de salle']);
	if (StateManager.RoomManager.PlayerInRoom(player.id)) return sendResponse(ws, 'error', 'error', ['Vous êtes déjà dans une salle']);
	const room = StateManager.RoomManager.getRoomById(json.room_id);
	if (!room) return sendResponse(ws, 'error', 'error', ['La salle n\'existe pas']);
	if (room.state == 'active') return sendResponse(ws, 'error', 'error', ['La salle est déjà lancée']);
	if (room.players.length >= 5) return sendResponse(ws, 'error', 'error', ['La salle est pleine']);
	StateManager.RoomManager.joinRoom(player, json.room_id);
}

function handleKickRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.room_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un id de salle']);
	if (!json.user_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier l\'id de la personne à expulser']);
	const room = StateManager.RoomManager.getRoomById(json.room_id);
	if (!room) return sendResponse(ws, 'error', 'error', ['La salle n\'existe pas']);
	if (room.state == 'active') return sendResponse(ws, 'error', 'error', ['La salle est déjà lancée']);
	if (room.owner_id !== player.id) return sendResponse(ws, 'error', 'error', ['Vous n\'êtes pas le propriétaire de la salle']);
	StateManager.RoomManager.removePlayerFromRoom(json.room_id, json.user_id);
}

function handleLeaveRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.room_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un id de salle']);
	StateManager.RoomManager.removePlayerFromRoom(json.room_id, player.id);
}

function handleSetOwnerRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.room_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un id de salle']);
	if (!json.user_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier l\'id de la personne à promouvoir']);
	const room = StateManager.RoomManager.getRoomById(json.room_id);
	if (!room) return sendResponse(ws, 'error', 'error', ['La salle n\'existe pas']);
	if (room.state == 'active') return sendResponse(ws, 'error', 'error', ['La salle est déjà lancée']);
	if (room.owner_id !== player.id) return sendResponse(ws, 'error', 'error', ['Vous n\'êtes pas le propriétaire de la salle']);
	const newOwner = room.players.find(p => p.id === json.user_id);
	if (!newOwner) return sendResponse(ws, 'error', 'error', ['Le joueur n\'est pas dans la salle']);
	if (newOwner.id === room.owner_id) return sendResponse(ws, 'error', 'error', ['Le joueur est déjà propriétaire']);
	room.owner_id = newOwner.id;
	room.owner_username = newOwner.username;
	sendResponse(ws, 'setOwner', 'success', ['Le joueur a été promu propriétaire']);
}

function handleLaunchRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.room_id) return sendResponse(ws, 'error', 'error', ['Veuillez spécifier un id de salle']);
	const room = StateManager.RoomManager.getRoomById(json.room_id);
	if (!room) return sendResponse(ws, 'error', 'error', ['La salle n\'existe pas']);
	if (room.state == 'active') return sendResponse(ws, 'error', 'error', ['La salle est déjà lancée']);
	if (room.owner_id !== player.id) return sendResponse(ws, 'error', 'error', ['Vous n\'êtes pas le propriétaire de la salle']);
	if (room.players.length < 2) return sendResponse(ws, 'error', 'error', ['Il faut au moins 2 joueurs pour lancer la partie']);
	if (room.players.length > 5) return sendResponse(ws, 'error', 'error', ['Il ne peut pas y avoir plus de 5 joueurs']);
	room.state = 'active';
	room.startTime = Date.now();
	room.players.forEach((p: player) => {
		p.gameId = room.id;
	});
}

async function PacManWebSocket(ws: WebSocket, user: User): Promise<void> {
	console.log('PacmanWS Connexion de l\'utilisateur:', user?.id);

	const player: player = {
		id: user.id,
		username: user.username,
		avatar: user.avatar,
		lang: user.lang,
		updateAt: Date.now(),
		gameId: null,
	};

	handleAddUser(ws, player);
	ws.on('message', (message: Buffer) => {
		let text: request | null = null;
		try {
			text = JSON.parse(message.toString().trim());
		} catch (e) {
			sendResponse(ws, 'error', 'error', ['Veuillez envoyer une réponse au format JSON']);
			return;
		}

		const action = text.action;
		if (!action) {
			sendResponse(ws, 'error', 'error', ['Veuillez spécifier une action']);
			return;
		}

		switch (action) {
			case 'ping':
				player.updateAt = Date.now();
				break;
			case 'createRoom':
				handleCreateRoom(ws, player, text);
				break;
			case 'joinRoom':
				handleJoinRoom(ws, player, text);
				break;
			case 'kickRoom':
				handleKickRoom(ws, player, text);
				break;
			case 'leaveRoom':
				handleLeaveRoom(ws, player, text);
				break;
			case 'setOwner':
				handleSetOwnerRoom(ws, player, text);
				break;
			case 'launchRoom':
				handleLaunchRoom(ws, player, text);
				break;
			default:
				ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Action non reconnue'] })); // to close
				break;
		}
	});

	ws.on('close', () => {
		console.log('PacmanWS Déconnexion de l\'utilisateur:', user?.id);
	});

	ws.on('error', (error: Error) => {
		console.error('PacmanWS Erreur WebSocket:', error);
		if (ws.readyState === WebSocket.OPEN) {
			ws.close(1008, JSON.stringify({ action: 'error', result: 'error', notification: ['Erreur WebSocket'] }));
		}
	});
}

export { PacManWebSocket };