import { WebSocket } from 'ws';

export interface User {
	id: number;
	email: string;
	username: string;
	password?: string;
	lang: string;
	friends?: Friends[];
	google_token?: string;
	avatar?: string;
}

export interface Message {
	id: number;
	sender_id: number;
	message: string;
	sent_at: Date;
}

export interface Group {
	id: number;
	name: string;
	members: WebSocket[];
	messages: Message[];
}

export interface Friends {
	id: number;
	friend_id: number;
	target: string;
	status: string;
}