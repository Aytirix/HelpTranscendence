import { FastifyInstance, Session } from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';

dotenv.config();

let store: CustomSQLiteStore = null;

class CustomSQLiteStore {
	private db: sqlite3.Database;

	constructor() {
		this.db = new sqlite3.Database('./sqlite/sessions.sqlite', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
		this.initTable();
	}

	private initTable() {
		const createTableSQL = `
			CREATE TABLE IF NOT EXISTS sessions (
				sid TEXT PRIMARY KEY,
				expired INTEGER,
				sess TEXT,
				user_id INTEGER UNIQUE
			);
		`;

		this.db.run(createTableSQL, (err) => {
			if (err) {
				console.error('Error creating sessions table:', err);
			}
		});
	}

	set(sid: string, session: Session, callback: (err?: Error) => void) {
		const userId = session.user?.id || null;
		const sess = JSON.stringify(session);
		const expiration = session.cookie?.expires ? new Date(session.cookie.expires).getTime() : null;

		this.db.run(
			`INSERT OR REPLACE INTO sessions (sid, expired, sess, user_id) VALUES (?, ?, ?, ?)`,
			[sid, expiration, sess, userId],
			(err) => {
				callback(err);
			}
		);
	}

	get(sid: string, callback: (err: any, session?: Session) => void) {
		console.log('get session', sid);
		this.db.get(
			`SELECT sess FROM sessions WHERE sid = ?`,
			[sid],
			(err, row: { sess: string } | undefined) => {
				if (err) return callback(err);
				if (!row) return callback(null);

				try {
					const session = JSON.parse(row.sess);
					callback(null, session);
				} catch (e) {
					callback(e);
				}
			}
		);
	}

	destroy(sid: string, callback: (err: any) => void) {
		console.log('get session', sid);
		this.db.run(
			`DELETE FROM sessions WHERE sid = ?`,
			[sid],
			(err) => {
				callback(err);
			}
		);
	}
}

export async function getStore() {
	if (!store) {
		store = new CustomSQLiteStore();
	}
	return store;
}

export async function registerSession(app: FastifyInstance) {
	const SQLiteStore = new CustomSQLiteStore();

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