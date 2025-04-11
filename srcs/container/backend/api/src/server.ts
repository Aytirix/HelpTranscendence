/// <reference path="./types/global.d.ts" />
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebsocket from '@fastify/websocket';
import fastifySession from '@fastify/session';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import { setupSwagger } from './docs';
import fastifyAjv from 'ajv';
import MySQLStoreFactory from 'express-mysql-session';
// import { encrypt, decrypt } from './src/controllers/tools'; // Utilitaires pour le cryptage/décryptage
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = fastify({
	https: {
		key: fs.readFileSync(path.join(__dirname, '../../../../data/cert/key.pem')),
		cert: fs.readFileSync(path.join(__dirname, '../../../../data/cert/cert.pem')),
	},
});

(async () => {
	await setupSwagger(app);
})();

const MySQLStore = MySQLStoreFactory(fastifySession as any);

app.register(fastifyHelmet);
app.register(fastifyRateLimit, {
	max: 500,
	timeWindow: '1 minute',
	keyGenerator: (req) => req.session.user.id || req.ip,
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
	secret: process.env.SESSION_SECRET!,
	cookie: {
		secure: true,
		maxAge: 24 * 60 * 60 * 1000, // 1 jour
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
		createDatabaseTable: true,
		schema: {
			tableName: 'sessions',
			columnNames: {
				session_id: 'session_id',
				expires: 'expires',
				data: 'data',
			},
		},
	}),
});

// Enregistrement des routes
app.register(userRoutes);

// Si une session n'a aucune information, on la détruit pour ne pas la stocker dans la base de données
app.addHook('onSend', async (request, reply, payload) => {
	if (request.session && Object.keys(request.session).length === 1) {
		request.session.destroy();
	}
	return payload;
});

app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});