export interface User {
	id: number;
	email: string;
	username: string;
	password?: string;
	google_token?: string;
	avatar?: string;
	lang: string;
}