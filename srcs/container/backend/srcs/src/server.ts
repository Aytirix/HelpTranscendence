/// <reference path="./types/global.d.ts" />

import * as dotenv from 'dotenv';
import fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { registerHook } from './hook';
import { registerSession } from './session';
import { registerRateLimit, registerHelmet } from './Middleware';
import { setupSwagger } from './docs';
import userRoutes from './routes/userRoutes';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';

const app = fastify({ trustProxy: true });

(async () => { await setupSwagger(app); })();

// Ajout de la gestion des erreurs Ajv
const ajv = new Ajv({
	allErrors: true,
	useDefaults: true,
	strict: false,
});
addFormats(ajv);
ajvErrors(ajv);
app.setValidatorCompiler(({ schema }) => { return ajv.compile(schema); });

// Middleware de sécurité
registerSession(app);
registerHook(app);
registerRateLimit(app);
registerHelmet(app);
app.register(fastifyWebsocket);

// Enregistrement des routes
app.register(userRoutes);

app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.clear();
	console.log(`Server listening at ${address}`);
});