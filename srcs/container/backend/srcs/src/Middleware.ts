async function isNotAuthenticated(request: any, reply: any, done: any) {
	if (request.session.user !== undefined) {
		return reply.status(403).send({
			message: 'Vous êtes déjà connecté',
		});
	}
}

export async function isAuthenticated(request: any, reply: any, done: any) {
	if (request.session.user === undefined) {
		return reply.status(401).send({
			message: 'Veuillez vous connecter pour accéder à cette ressource',
		});
	}
}

export default {
	isNotAuthenticated,
	isAuthenticated,
};