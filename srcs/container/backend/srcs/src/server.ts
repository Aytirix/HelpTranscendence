/// <reference path="./types/global.d.ts" />

import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { registerHook } from './hook';
import { registerSession } from './session';
import { registerRateLimit, registerHelmet } from './Middleware';
import { setupSwagger } from './docs';
import { initWebSocket } from './WebSocket/wsInit';  // Import de la fonction WebSocket
import userRoutes from './routes/userRoutes';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvErrors from 'ajv-errors';

const app = fastify({ trustProxy: true });

(async () => { await setupSwagger(app); })();

const ajv = new Ajv({
	allErrors: true,
	useDefaults: true,
	strict: false,
});

addFormats(ajv);
ajvErrors(ajv);
app.setValidatorCompiler(({ schema }) => { return ajv.compile(schema); });
// Middleware de sécurité
(async () => {
	await registerSession(app);
	registerHook(app);
	registerRateLimit(app);
	registerHelmet(app);
})();

app.register(fastifyCors, {
	origin: 'https://localhost:3000',
	credentials: true,
});

// Enregistrement des routes
app.register(userRoutes);

// Intégration de WebSocket
initWebSocket(app);  // Appel de la fonction initWebSocket

app.get('*', (req, res) => {
	res.status(404).send('{ "success": false, "message": "The endpoint you are looking for might have been removed, had its name changed, or is temporarily unavailable." }');
});

try {
	app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
		if (err) {
			console.error(err);
			process.exit(1);
		}
		console.clear();
		console.log(`Server listening at ${address}`);
	});
} catch (err) {
	console.error('Error starting server:', err);
	process.exit(1);
}