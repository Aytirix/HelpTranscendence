import fastify from 'fastify';
import { SessionData } from '@fastify/session';
import { User } from '../models/userModel';

declare module 'fastify' {
	interface Session {
		user?: User;
	}
}