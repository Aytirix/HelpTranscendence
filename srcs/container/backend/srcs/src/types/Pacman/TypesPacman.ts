import { WebSocketServer, WebSocket } from 'ws';

export type GameState = 'waiting' | 'active' | 'finished';

export interface room {
	id: number;
	name: string;
	owner_id: number;
	owner_username: string;
	players?: player[];
	numberOfPlayers?: number;
	state: GameState;
	startTime?: number;
}

export interface player {
	id: number;
	username: string;
	lang: string;
	avatar: string;
	updateAt: number;
	gameId: number;
}
