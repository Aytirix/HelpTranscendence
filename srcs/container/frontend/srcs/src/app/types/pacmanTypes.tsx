import { WebSocketStatus } from '../../api/useSafeWebSocket';
import { User } from './userTypes';

export interface room {
	id: number;
	name: string;
	owner_id: number;
	owner_username: string;
	players?: User[];
	numberOfPlayers?: number;
}

export interface state {
	ws: WebSocket | null;
	statusws?: WebSocketStatus;
	player: User | null;
	rooms: {
		active: room[];
		waiting: room[];
	}
}
