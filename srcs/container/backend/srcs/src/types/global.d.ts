import fastify from 'fastify';
import { SessionData } from '@fastify/session';
import { User } from '@types';
import { WebSocket } from 'ws';

declare module 'fastify' {
	interface Session {
		user?: User;
	}
}

declare module 'fastify' {
	interface FastifyRequest {
		i18n: i18next.i18n;
		session: SessionData;
	}
}