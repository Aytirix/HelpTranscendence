import { WebSocket } from 'ws';

export interface User {
	id: number;
	email: string;
	username: string;
	password?: string;
	lang: string;
	google_token?: string;
	avatar?: string;
}

export interface Message {
	id: number;
	sender_id?: number;
	message: string;
	sent_at: Date;
}

export interface Group {
	id: number;
	name: string;
	members: User[];
	owners_id: number[];
	onlines_id: number[];
	messages: Message[];
}

export interface Friends {
	id: number;
	user_one_id: number;
	user_two_id: number;
	target: string;
	status: 'friend' |'blocked' | 'pending';
}