import { FastifyRequest, FastifyReply } from 'fastify';
import userModel from '@models/userModel';
import i18n from '@i18n';

export const Login = async (request: FastifyRequest, reply: FastifyReply) => {
	const { email, password } = request.body as { email: string; password: string };

	const user = await userModel.Login(email, password);

	if (user === null) {
		return reply.status(401).send({
			message: request.i18n.t('login.failed'),
		});
	}

	request.session.user = user;

	return reply.send({
		message: request.i18n.t('login.welcome'),
	});
};

export const Register = async (request: FastifyRequest, reply: FastifyReply) => {
	const { email, username, password, confirmPassword, lang } = request.body as { email: string; username: string, password: string, confirmPassword: string, lang: string };

	if (await userModel.emailAlreadyExists(email)) {
		return reply.status(409).send({
			message: request.i18n.t('errors.email.alreadyExists'),
		});
	}

	if ((await userModel.usernameAlreadyExists(email))) {
		return reply.status(409).send({
			message: request.i18n.t('errors.username.alreadyExists'),
		});
	}

	if (password !== confirmPassword) {
		return reply.status(400).send({
			message: request.i18n.t('errors.password.notMatching'),
		});
	}

	const user = await userModel.Register(email, username, password, lang);

	request.i18n.changeLanguage(lang);
	request.session.user = user;

	return reply.send({
		message: request.i18n.t('login.welcome'),
	});
};

export const UpdateUser = async (request: FastifyRequest, reply: FastifyReply) => {
	const body = request.body as {
		email: string | null;
		username: string | null;
		password: string | null;
		confirmPassword: string | null;
		lang: string | null;
	};

	const email = body.email || null;
	const username = body.username || null;
	const password = body.password || null;
	const confirmPassword = body.confirmPassword || null;
	const lang = body.lang || null;

	if (!email && !username && !password && !confirmPassword && !lang) {
		return reply.status(400).send({
			message: request.i18n.t('errors.user.noChanges'),
		});
	}

	const user = request.session.user;

	if (email && email !== user.email && await userModel.emailAlreadyExists(email)) {
		return reply.status(409).send({
			message: request.i18n.t('errors.email.alreadyExists'),
		});
	}

	if (username && username !== user.username && await userModel.usernameAlreadyExists(username)) {
		return reply.status(409).send({
			message: request.i18n.t('errors.username.alreadyExists'),
		});
	}

	if (password !== confirmPassword) {
		return reply.status(400).send({
			message: request.i18n.t('errors.password.notMatching'),
		});
	}

	if (lang && lang !== user.lang) {
		request.i18n.changeLanguage(lang);
	}

	await userModel.UpdateUser(user.id.toString(), email, username, password, lang);
	request.session.user = {
		...user,
		email: email || user.email,
		username: username || user.username,
		lang: lang || user.lang,
	};
	return reply.send({
		message: `email: ${email || user.email}, username: ${username || user.username}, lang: ${lang || user.lang}`,
	});
}

export const Logout = async (request: FastifyRequest, reply: FastifyReply, msg: boolean = true) => {
	await request.session.destroy();
	if (msg) {
		return reply.send({
			message: request.i18n.t('login.logout'),
		});
	}
};

export default {
	Login,
	Register,
	UpdateUser,
	Logout,
};