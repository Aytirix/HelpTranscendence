export interface User {
	id: number;
	email: string;
	username: string;
	password?: string;
	google_token?: string;
	avatar?: string;
	lang: string;
}

export interface Message {
	id: number;
	sender_id: number;
	message: string;
	sent_at: Date;
}

export interface Group {
	group_id: number;
	name: string;
	members: User[];
	messages: Message[];
}