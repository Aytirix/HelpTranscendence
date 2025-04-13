import { FastifyInstance } from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import MySQLStoreFactory from 'express-mysql-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

export async function registerSession(app: FastifyInstance) {
	const SQLiteStore = SQLiteStoreFactory(fastifySession as any);
	app.register(fastifyCookie);
	app.register(fastifySession, {
		secret: process.env.SESSION_SECRET,
		cookie: {
			secure: true,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
			httpOnly: true,
			sameSite: 'lax',
		},
		store: new SQLiteStore({
			db: 'sessions.sqlite',
			dir: './sqlite',
			concurrentDB: true,
			table: 'sessions',
		}),
	});
}