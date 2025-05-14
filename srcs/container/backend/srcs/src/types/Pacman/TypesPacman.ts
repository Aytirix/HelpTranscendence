import { WebSocketServer, WebSocket } from 'ws';

export type GameState = 'waiting' | 'active' | 'finished';

export interface room {
	id: number;
	name: string;
	owner_id: number;
	players: player[];
	state: GameState;
}

export interface player {
	id: number;
	username: string;
	lang: string;
	avatar: string;
	updateAt: number;
	gameId: number;
}
