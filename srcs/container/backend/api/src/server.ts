import fastify from 'fastify';
import fastifyAjv from 'ajv';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySecureSession from '@fastify/secure-session';
import fastifyWebsocket from '@fastify/websocket';
import * as dotenv from 'dotenv';
// import { encrypt, decrypt } from './src/controllers/tools'; // Utilitaires pour le cryptage/décryptage
import userRoutes from './routes/userRoutes';

dotenv.config();

const app = fastify();

// Securite et performances
app.register(fastifyCors);
app.register(fastifyHelmet);
app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });
app.register(fastifySecureSession, { secret: process.env.SESSION_SECRET, salt: process.env.SESSION_SALT, cookie: { secure: true } });

// Enregistrement des routes
app.register(userRoutes);

app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});