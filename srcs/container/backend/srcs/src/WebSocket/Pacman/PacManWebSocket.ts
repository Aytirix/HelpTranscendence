import { WebSocket, RawData } from 'ws'
import { User } from '@types'
import { player } from "@Pacman/TypesPacman";
import StateManager from './game/StateManager';
import { request } from '@typesChat';

function handleAddUser(player: player, ws: WebSocket): void {
	console.log('PacmanWS Ajout de l\'utilisateur:', player);
	StateManager.addPlayer(player, ws);
}

(async () => {
	StateManager.loopRooms();
})();

function handleCreateRoom(json: any): void {

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

	handleAddUser(player, ws);
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
				handleCreateRoom(text);
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