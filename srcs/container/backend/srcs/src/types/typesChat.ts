import { skGroup, Message, User, Group } from "@types";
import { WebSocketServer, WebSocket } from 'ws';

export interface State {
	groups: skGroup[];
	users_connected: WebSocket[];
}

export interface reponse {
	action: string;
}

export interface send_friend_connected {
	action: 'friend_connected';
	user: User;
}

export interface send_connected {
	action: 'connected';
	user: User;
	groups: Group[];
	friends_connected: User[];
}

//  l'api attend cette reponse pour un nouveau message
export interface req_newMessage {
	action: string;
	group_id: number;
	message: string;
}

// Envoyer le message a toutes les personnes de la conversation
export interface res_newMessage {
	action: 'new_message';
	group_id: number;
	message: Message;
}

export interface res_disconnect {
	action: 'user_disconnected';
	user_id: number;
}

export interface req_ping {
	action: 'ping';
}

export interface req_pong {
	action: 'pong';
}