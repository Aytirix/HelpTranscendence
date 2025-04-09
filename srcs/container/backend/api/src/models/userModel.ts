import executeReq from './database';

interface User {
	id: number;
	username: string;
	email: string;
	avatar: string;
	lang: string;
}

export const getUsers = async (): Promise<User[]> => {
	const result = await executeReq('SELECT * FROM users');
	console.log('result :', result);
	return (result as any[]).map((user: any) => ({
		id: user.id,
		username: user.username,
		email: user.email,
		avatar: user.avatar,
		lang: user.lang,
	}));
};
