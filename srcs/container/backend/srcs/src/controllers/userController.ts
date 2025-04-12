import { FastifyRequest, FastifyReply } from 'fastify';
import userModel from '@models/userModel';
import i18n from '@i18n';

export const getAllUsers = async (req: FastifyRequest, reply: FastifyReply) => {

	return reply.send(req.session.user);
};

export const Login = async (request: FastifyRequest, reply: FastifyReply) => {
	const { email, password } = request.body as { email: string; password: string };

	const user = await userModel.Login(email, password);

	if (user === null) {
		return reply.status(401).send({
			message: i18n.t('login.failed'),
		});
	}

	request.session.user = user;

	return reply.send({
		message: i18n.t('login.welcome'),
	});
};

export const Register = async (request: FastifyRequest, reply: FastifyReply) => {
	const { email, username, password, confirmPassword, lang } = request.body as { email: string; username: string, password: string, confirmPassword: string, lang: string };

	if (await userModel.emailAlreadyExists(email)) {
		return reply.status(409).send({
			message: i18n.t('error.email.alreadyExists'),
		});
	}

	if ((await userModel.usernameAlreadyExists(email))) {
		return reply.status(409).send({
			message: i18n.t('error.username.alreadyExists'),
		});
	}

	if (password !== confirmPassword) {
		return reply.status(400).send({
			message: i18n.t('error.password.notMatching'),
		});
	}

	const user = await userModel.Register(email, username, password, lang);

	i18n.changeLanguage(lang);
	request.session.user = user;

	return reply.send({
		message: i18n.t('login.welcome'),
	});
};

export const Logout = async (request: FastifyRequest, reply: FastifyReply) => {
	await request.session.destroy();
	reply.clearCookie('sessionId');
	reply.header('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
	return reply.send({
		message: i18n.t('login.logout'),
	});
};

export default {
	getAllUsers,
	Login,
	Register,
	Logout,
};