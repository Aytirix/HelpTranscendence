import { WebSocketStatus } from '../../api/useSafeWebSocket';

export interface Player {
  id: number;
  username: string;
}

export interface Room {
  id: number;
  name: string;
  owner_id: number;
  players: Player[];
  state: string;
}

export interface State {
	ws: WebSocket | null;
	statusws?: WebSocketStatus;
	rooms: {
		active: Room[];
		waiting: Room[];
	}
}
