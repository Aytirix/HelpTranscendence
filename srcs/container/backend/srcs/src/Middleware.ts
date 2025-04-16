import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';
import { User } from '@types';
import { IncomingMessage } from 'http';
import { parse } from 'cookie';
import { getStore } from '@session';

async function isNotAuthenticated(request: FastifyRequest, reply: FastifyReply) {
	if (request.session.user !== undefined) {
		return reply.status(403).send({
			message: request.i18n.t('login.alreadyLoggedIn'),
		});
	}
}

export async function isAuthenticated(request: FastifyRequest, reply: FastifyReply) {
	if (request.session.user === undefined) {
		return reply.status(401).send({
			message: request.i18n.t('login.notLoggedIn'),
		});
	}
}

export async function isAuth(request: FastifyRequest, reply: FastifyReply) {
	const user = request.session.user as User;
	if (request.session.user !== undefined) {
		return reply.status(200).send({
			isAuthenticated: true,
			user: {
				email: user.email,
				username: user.username,
				lang: user.lang,
				avatar: user.avatar,
			},
		});
	}
	return reply.status(200).send({
		isAuthenticated: false,
		user: null,
	});
}

export async function registerRateLimit(app: FastifyInstance) {
	app.register(fastifyRateLimit, {
		max: 500,
		timeWindow: '1 minute',
		errorResponseBuilder: (req, context) => {
			return {
				statusCode: 429,
				error: 'Too Many Requests',
				message: `Trop de requêtes. Veuillez réessayer dans ${Math.ceil(context.ttl / 1000)} secondes.`,
			};
		}
	});
}

export async function registerHelmet(app: FastifyInstance) {
	app.register(fastifyHelmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				imgSrc: ["'self'", "https:", "data:"],
				scriptSrc: ["'self'"],
				upgradeInsecureRequests: [],
				styleSrc: ["'self'", "https:"],
				objectSrc: ["'none'"],
			}
		}
	});
}

export async function parseSession(request: IncomingMessage): Promise<any> {
	const cookies = parse(request.headers.cookie || '');
	const rawSessionId = cookies['sessionId'];

	if (!rawSessionId) return null;

	const sid = rawSessionId.split('.')[0];

	const store = await getStore();

	return new Promise((resolve, reject) => {
		store.get(sid, (err: any, session: any) => {
			if (err) return reject(err);
			resolve(session);
		});
	});
}

export default {
	isNotAuthenticated,
	isAuthenticated,
	isAuth,
	registerRateLimit,
	registerHelmet,
	parseSession,
};