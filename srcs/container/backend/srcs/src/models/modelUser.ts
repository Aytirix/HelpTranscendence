import bcrypt from 'bcrypt';
import executeReq from '@models/database';
import { User } from '@types';
import tools from '@tools';

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
	if (result.affectedRows === 0) {
		throw new Error('Failed to register user');
	}
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

export const UpdateUser = async (id: string, email: string = null, username: string = null, password: string = null, lang: string = null): Promise<void> => {
	const updates: string[] = [];
	const params: (string | null)[] = [];

	if (email) {
		updates.push('email = ?');
		params.push(email);
	}

	if (username) {
		updates.push('username = ?');
		params.push(username);
	}

	if (password) {
		const hashedPassword = await tools.hashPassword(password);
		updates.push('password = ?');
		params.push(hashedPassword);
	}

	if (lang) {
		updates.push('lang = ?');
		params.push(lang);
	}

	params.push(id);

	await executeReq(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
};

export const getUserById = async (id: number): Promise<User | null> => {
	const result: any = await executeReq('SELECT * FROM users WHERE id = ?', [id]);
	if (result.length === 0) {
		return null;
	}
	return {
		id: result[0].id,
		username: result[0].username,
		avatar: result[0].avatar,
		lang: result[0].lang,
	};
};

export const searchUser = async (name: string): Promise<User[]> => {
	const result: any = await executeReq('SELECT * FROM users WHERE username LIKE ? LIMIT 10', [`%${name}%`]);
	if (result.length === 0) {
		return [];
	}
	const users: User[] = [];
	for (const user of result) {
		users.push({
			id: user.id,
			username: user.username,
			avatar: user.avatar,
			lang: user.lang,
		});
	}
	return users;
};

export default {
	Login,
	Register,
	emailAlreadyExists,
	usernameAlreadyExists,
	UpdateUser,
	getUserById,
	searchUser,
};