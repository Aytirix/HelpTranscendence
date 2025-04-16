import { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import fastify from 'fastify';

let wss: WebSocketServer | null = null;

function initWebSocket(server: any): void {
	console.log('Initialisation de WebSocket...');

	// Vérification si le serveur WebSocket est déjà initialisé
	if (wss) {
		console.log('WebSocketServer déjà initialisé, aucune action effectuée.');
		return;
	}

	// Initialisation de WebSocketServer avec la configuration
	wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, clientTracking: true });

	// Gérer les connexions WebSocket
	wss.on('connection', (ws, req: IncomingMessage) => {
		const path = req.url;

		console.log(`Nouvelle connexion WebSocket sur ${path}`);

		// Réception des messages du client
		ws.on('message', (message: string) => {
			console.log('Message reçu:', message);
			// Réponse au client
			ws.send(`Message reçu: ${message}`);
		});

		// Gestion de la fermeture de la connexion
		ws.on('close', () => {
			console.log('La connexion WebSocket a été fermée');
		});

		// Gestion des erreurs WebSocket
		ws.on('error', (error: Error) => {
			console.error('Erreur WebSocket:', error);
		});
	});

	// Intégration avec Fastify pour gérer les requêtes WebSocket
	server.server.on('upgrade', (request, socket, head) => {
		console.log('Requête d\'upgrade WebSocket reçue');
		// Vérification de la requête d'upgrade vers WebSocket
		if (request.url === '/ws') {
			// On monte la connexion WebSocket
			wss?.handleUpgrade(request, socket as Socket, head, (ws) => {
				wss?.emit('connection', ws, request);
			});
		} else {
			// Si ce n'est pas pour le WebSocket, on passe à la suite
		}
	});
}

export { initWebSocket };
