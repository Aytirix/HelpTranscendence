import { FastifyInstance } from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import SQLiteStoreFactory from 'connect-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

let store: any = null;

export async function getStore() {
	if (!store) {
		const SQLiteStore = SQLiteStoreFactory(fastifySession as any);
		store = new SQLiteStore({
			db: 'sessions.sqlite',
			dir: './sqlite',
			concurrentDB: true,
			table: 'sessions',
		});
	}
	return store;
}

export async function registerSession(app: FastifyInstance) {
	const SQLiteStore = SQLiteStoreFactory(fastifySession as any);
	app.register(fastifyCookie);
	app.register(fastifySession, {
		secret: process.env.SESSION_SECRET,
		cookie: {
			secure: true,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
			httpOnly: true,
			sameSite: 'none',
			path: '/',
		},
		store: await getStore(),
	});
}

export default {
	getStore,
	registerSession,
}