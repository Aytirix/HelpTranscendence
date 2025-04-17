import { FastifyInstance } from 'fastify';
import { Logout } from '@controllers/controllerUser';
import i18n from './i18n';

export async function registerHook(app: FastifyInstance) {

	app.setErrorHandler(async (error, request, reply) => {
		// Si l'erreur est une erreur de validation, on renvoie un message d'erreur
		// avec la bonne traduction
		if (error.validation && !reply.sent) {
			const messages = error.validation.map(err => {
				const code = err.message;
				return request.i18n.t(code);
			});

			return reply.status(400).send({
				message: messages.join(" | ")
			});
		}

		if (!reply.sent) {
			console.error(error);
			reply.status(error.statusCode || 500).send({
				message: error.message
			});
		}
	});

	app.addHook('onRequest', async (request, reply) => {
		let lang = '';
		if (request.session && request.session.user) {
			lang = request.session.user.lang;
		} else if (request.headers['accept-language']) {
			lang = request.headers['accept-language'];
		}
		lang = lang.split(',')[0].split('-')[0];
		lang = lang.toLowerCase().trim();
		if (lang !== 'fr' && lang !== 'en' && lang !== 'es') {
			lang = 'fr';
		}
		request.i18n = i18n.cloneInstance({ lng: lang, fallbackLng: 'fr' });
	});

	// Si une session n'a aucune information, on la détruit pour ne pas la stocker dans la base de données
	app.addHook('onSend', async (request, reply, payload) => {
		if (request.session && Object.keys(request.session).length === 1) {
			Logout(request, reply, false);
		}
	});
}