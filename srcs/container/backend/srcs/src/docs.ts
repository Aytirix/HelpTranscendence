import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

export async function setupSwagger(app: FastifyInstance) {
	// Enregistrement de Swagger avec gestion des erreurs
	try {
		await app.register(fastifySwagger, {
			openapi: {
				info: {
					title: 'Mon API',
					version: '1.0.0',
					description: 'Documentation auto-générée',
				},
				servers: [
					{
						url: 'https://localhost:7000/',
						description: 'Serveur de développement',
					},
					{
						url: 'https://c1r1p4:7000/',
						description: 'Serveur de développement',
					}
				],
				components: {
					securitySchemes: {
						apiKeyAuth: {
							name: 'sessionId',
							in: 'cookie',
							type: 'apiKey',
							description: 'Passez le token d\'authentification dans l\'en-tête de la requête',
						},
					},
				},
				security: [
					{
						apiKeyAuth: [],
					},
				],
			},
		});

		// Enregistrement de Swagger UI
		await app.register(fastifySwaggerUi, {
			routePrefix: '/docs',
			uiConfig: {
				docExpansion: 'list',
				deepLinking: true, // Permet les liens profonds vers des sections spécifiques de la doc
				defaultModelsExpandDepth: -1, // Cache les modèles par défaut
			},
			staticCSP: true, // Active le CSP pour une sécurité accrue
			transformSpecification: (swaggerObject) => {
				// Transformation du Swagger pour ajouter des informations supplémentaires
				swaggerObject.info.version = '1.0.0'; // Version dynamique si besoin
				return swaggerObject;
			},
		});
	} catch (err) {
		console.error('Erreur lors de la configuration de Swagger:', err);
		throw new Error('Swagger setup failed');
	}
}
