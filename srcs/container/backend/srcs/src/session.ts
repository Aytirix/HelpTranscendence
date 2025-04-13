import { FastifyInstance } from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import MySQLStoreFactory from 'express-mysql-session';

export async function registerSession(app: FastifyInstance) {
	const MySQLStore = MySQLStoreFactory(fastifySession as any);
	app.register(fastifyCookie);
	app.register(fastifySession, {
		secret: process.env.SESSION_SECRET,
		cookie: {
			secure: true,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
			httpOnly: true,
			sameSite: 'lax',
		},
		store: new MySQLStore({
			host: process.env.DB_HOST,
			port: 3306,
			user: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
			clearExpired: true,
			checkExpirationInterval: 60 * 60 * 1000, // 1 heure
			expiration: 7 * 24 * 60 * 60 * 1000, // 7 jours
		}),
	});
}