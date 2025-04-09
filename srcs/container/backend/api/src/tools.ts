import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import * as dotenv from 'dotenv';
import { encrypt, decrypt } from './src/controllers/tools'; // Utilitaires pour le cryptage/décryptage


const app = fastify();

app.get('/', async (request, reply) => {
	return { message: 'Hello, world!' };
});

app.listen({ port: 7000, host: '0.0.0.0' }, (err, address) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${address}`);
});