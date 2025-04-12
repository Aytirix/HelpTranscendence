/// <reference path="./types/global.d.ts" />

import * as dotenv from 'dotenv';
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import fastifySession from '@fastify/session';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import { setupSwagger } from './docs';
import MySQLStoreFactory from 'express-mysql-session';
import userRoutes from './routes/userRoutes';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';
import i18n from './i18n';

dotenv.config();

const app = fastify({
	trustProxy: true,
});

(async () => {
	await setupSwagger(app);
})();

const MySQLStore = MySQLStoreFactory(fastifySession as any);

// Ajout de la gestion des erreurs Ajv
const ajv = new Ajv({
	allErrors: true,
	useDefaults: true,
	strict: false,
});
addFormats(ajv);
ajvErrors(ajv);
app.setValidatorCompiler(({ schema }) => {
	return ajv.compile(schema);
});

// Middleware de sécurité
app.register(fastifyHelmet);
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
app.register(fastifyWebsocket);
app.register(fastifyCookie);
app.register(fastifySession, {
	secret: process.env.SESSION_SECRET,
	cookie: {
		secure: true,
		maxAge: 24 * 60 * 60 * 1000, // 1 jour
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
		expiration: 24 * 60 * 60 * 1000, // 1 jour
	}),
});

// Enregistrement des routes
app.register(userRoutes);

app.setErrorHandler((error, request, reply) => {
	console.error(error);
	if (error.validation && !reply.sent) {
		const messages = error.validation
			.map(err => err.message)
			.filter(Boolean);

		return reply.status(400).send({
			message: messages.join(" | ")
		});
	}

	if (!reply.sent) {
		reply.status(error.statusCode || 500).send({

			message: error.message
		});
	}
});

app.addHook('onRequest', async (request, reply) => {
	let lang = request.cookies['language'] || request.headers['accept-language'] || 'fr';
	lang = lang.split(',')[0].split('-')[0];

	console.log('Langue détectée:', lang);  // Log pour vérifier la langue
	i18n.changeLanguage(lang);
});

// Si une session n'a aucune information, on la détruit pour ne pas la stocker dans la base de données
app.addHook('onSend', async (request, reply, payload) => {
	if (request.session && Object.keys(request.session).length === 1) {
		await request.session.destroy();
		if (!reply.sent) {
			reply.clearCookie('sessionId');
			reply.header('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
		}
	}
});

app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});