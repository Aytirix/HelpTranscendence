import { FastifyInstance, FastifyReply, FastifyRequest, Session } from 'fastify';
import { User } from '@types';
import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import { getStore } from '@session';

async function isNotAuthenticated(request: FastifyRequest, reply: FastifyReply) {
	if (request && request.session && request.session.user !== undefined) {
		return reply.status(403).send({
			message: request.i18n.t('login.alreadyLoggedIn'),
		});
	}
}

export async function isAuthenticated(request: FastifyRequest, reply: FastifyReply) {
	if (!request || !request.session || request.session.user === undefined) {
		return reply.status(401).send({
			message: request.i18n.t('login.notLoggedIn'),
		});
	}
}

export async function isAuth(request: FastifyRequest, reply: FastifyReply) {
	if (request && request.session && request.session.user !== undefined) {
		const user = request.session.user as User;
		return reply.status(200).send({
			isAuthenticated: false,
			user: {
				email: user.email,
				username: user.username,
				lang: user.lang,
				avatar: user.avatar || null,
			},
		});
	} else {
		return reply.status(401).send({
			isAuthenticated: false,
			user: null,
		});
	}
}

export async function getSessionByCookie(request: IncomingMessage): Promise<Session | null> {
	try {
		const cookies = parse(request.headers.cookie || '');
		const rawSessionId = cookies['sessionId'];

		if (!rawSessionId) return null;
		const sid = rawSessionId.split('.')[0];

		const store = await getStore();

		return new Promise((resolve, reject) => {
			store.get(sid, (err: any, session: Session) => {
				if (err) return reject(err);
				resolve(session);
			});
		});
	} catch (err) {
		console.error('Error fetching session:', err);
		return null;
	}
}

export default {
	isNotAuthenticated,
	isAuthenticated,
	isAuth,
	getSessionByCookie,
};