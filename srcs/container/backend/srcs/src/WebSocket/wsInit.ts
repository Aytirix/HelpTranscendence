import { parse } from 'cookie';
import SQLiteStoreFactory from 'connect-sqlite3';
import { Socket } from 'net';
import { IncomingMessage } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import Middleware from '@Middleware';
import chatWebSocket from './chat/wsChat';
import { User } from '@types';
import { pongWebSocket } from './pongGame/pongSocketHandler';

let wss: WebSocketServer | null = null;

async function initWebSocket(server: FastifyInstance) {
	if (wss) return;

	wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, clientTracking: true });

	wss.on('connection', (ws: WebSocket, user: User, req: IncomingMessage) => {
		const path = req.url;

		switch (path) {
			case '/chat':
				chatWebSocket(wss, ws, user, req);
				break;
			case '/pong' :
				pongWebSocket(ws, user);
				break; 
			default:
				const errorMsg = 'Erreur : chemin WebSocket non reconnu.';
				console.warn(`[WebSocket] ${errorMsg} URL demandée: ${path}`);
				ws.send(JSON.stringify({ error: errorMsg }));
				ws.close(1008, 'Chemin WebSocket invalide');
				break;
		}
	});

	server.server.on('upgrade', async (request: IncomingMessage, socket: Socket, head: Buffer) => {
		try {
			const session = await Middleware.getSessionByCookie(request);
			if (!session || !session.user) {
				socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
				socket.destroy();
				return;
			}

			wss?.handleUpgrade(request, socket, head, (ws: WebSocket) => {
				wss?.emit('connection', ws, session.user, request);
			});
		} catch (err) {
			console.error('Erreur lors de la gestion de la connexion WebSocket:', err);
			socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
			socket.destroy(); 
		}
	});
}

export { initWebSocket };
