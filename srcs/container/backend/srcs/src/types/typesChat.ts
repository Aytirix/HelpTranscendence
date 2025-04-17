import { Group, Message, User } from "@types";

export interface State {
	groups: Group[];
	users_connected: User[];
}

export interface reponse {
	action: string;
}

export interface req_newMessage {
	action: string;
	group_id: number;
	message: string;
}

export interface res_newMessage {
	action: string;
	group_id: number;
	message: Message;
}

export interface req_ping {
	action: 'ping';
}

export interface req_pong {
	action: 'pong';
}