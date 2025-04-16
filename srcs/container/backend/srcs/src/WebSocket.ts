import { parse } from 'cookie';
import SQLiteStoreFactory from 'connect-sqlite3';
import { Socket } from 'net';
import { IncomingMessage } from 'http';
import { Server as WebSocketServer } from 'ws';
import { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import Middleware from '@Middleware';

let wss: WebSocketServer | null = null;

async function initWebSocket(server: FastifyInstance) {
    console.log('Initialisation de WebSocket...');

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

        ws.on('message', (message: string) => {
            console.log('Message reçu:', message);
            ws.send(`Message reçu: ${message}`);
        });

        ws.on('close', () => {
            console.log('La connexion WebSocket a été fermée');
        });

        ws.on('error', (error: Error) => {
            console.error('Erreur WebSocket:', error);
        });
    });

    // Intégration avec Fastify pour gérer les requêtes WebSocket
    server.server.on('upgrade', async (request: IncomingMessage, socket: Socket, head: Buffer) => {
        try {
            // Récupérer la session dans le store SQLite
			const session = await Middleware.parseSession(request);

			if (!session || !session.user) {
				socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
				socket.destroy();
				return;
			}
			
            // Si la session est valide, on peut accepter la connexion WebSocket
            if (request.url === '/ws') {
                wss?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
                    // Attacher l'utilisateur à la connexion WebSocket
                    (ws as any).user = session.user;
                    wss?.emit('connection', ws, request);
                });
            }
        } catch (err) {
			console.error('Erreur lors de la gestion de la connexion WebSocket:', err);
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
            socket.destroy();
        }
    });
}

export { initWebSocket };
