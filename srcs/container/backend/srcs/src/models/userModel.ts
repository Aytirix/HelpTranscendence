import bcrypt from 'bcrypt';
import executeReq from '@models/database';
import { User } from '@types';
import tools from '@tools';

export const getUsers = async (): Promise<User[]> => {
	const result = await executeReq('SELECT * FROM users');
	return (result as any[]).map((user: User) => ({
		id: user.id,
		username: user.username,
		email: user.email,
		avatar: user.avatar,
		lang: user.lang,
	}));
};

export const Login = async (email: string, password: string): Promise<User | null> => {
	const result = await executeReq('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1', [email, email]) as User[];
	if (result.length === 0) {
		return null;
	}

	const user = result[0];
	// Vérifier si le mot de passe est correct
	if (!(await bcrypt.compare(password, user.password))) {
		return null;
	}

	return {
		id: user.id,
		username: user.username,
		email: user.email,
		avatar: user.avatar,
		lang: user.lang,
	};
};

export const Register = async (email: string, username: string, password: string, lang: string): Promise<User> => {
	const hashedPassword = await tools.hashPassword(password);
	const result: any = await executeReq(
		'INSERT INTO users (email, username, password, lang) VALUES (?, ?, ?, ?)',
		[email, username, hashedPassword, lang],
	);
	return {
		id: result.insertId,
		username,
		email,
		lang,
	};
};

export const emailAlreadyExists = async (email: string): Promise<boolean> => {
	const result: any = await executeReq('SELECT * FROM users WHERE email = ?', [email]);
	if (result.length === 0) {
		return false;
	}
	return true;
};

export const usernameAlreadyExists = async (username: string): Promise<boolean> => {
	const result: any = await executeReq('SELECT * FROM users WHERE username = ?', [username]);
	if (result.length === 0) {
		return false;
	}
	return true;
};

export default {
	getUsers,
	Login,
	Register,
	emailAlreadyExists,
	usernameAlreadyExists,
};