import { WebSocket, RawData } from 'ws'
import { User } from '@types'
import { player } from "@Pacman/TypesPacman";
import StateManager from './game/StateManager';
import { request } from '@typesChat';

(async () => {
	StateManager.loopRooms();
})();

function handleAddUser(ws: WebSocket, player: player): void {
	StateManager.addPlayer(ws, player);
}

function handleCreateRoom(ws: WebSocket, player: player, json: any): void {
	if (!json.name) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier un nom de salle'] }));
	if (json.name.length < 3 || json.name.length > 15) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Le nom de la salle doit faire entre 3 et 15 caractères'] }));
	if (StateManager.RoomManager.getRoomByName(json.name)) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Le nom de la salle est déjà utilisé'] }));
	if (StateManager.RoomManager.PlayerInRoom(player)) return ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Vous êtes déjà dans une salle'] }));
	StateManager.RoomManager.createRoom(player, json.name);
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
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez envoyer une réponse au format JSON'] })); // to close
			return true;
		}

		const action = text.action;
		if (!action) {
			ws.send(JSON.stringify({ action: 'error', result: 'error', notification: ['Veuillez spécifier une action'] })); // to close
			return true;
		}

		switch (action) {
			case 'ping':
				player.updateAt = Date.now();
				break;
			case 'createRoom':
				handleCreateRoom(ws, player, text);
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