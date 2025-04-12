import { FastifyInstance } from 'fastify';
import userController from '@controllers/userController';
import userSchema from '@schemas/userSchema';
import Middleware from '@Middleware';

export default async (fastify: FastifyInstance) => {
	fastify.get('/', {
		preHandler: Middleware.isAuthenticated,
		handler: userController.getAllUsers
	});

	fastify.post('/login', {
		preHandler: Middleware.isNotAuthenticated,
		schema: userSchema.login,
		handler: userController.Login
	});

	fastify.post('/register', {
		preHandler: Middleware.isNotAuthenticated,
		schema: userSchema.register,
		handler: userController.Register
	});

	fastify.get('/logout', {
		schema: userSchema.logout,
		handler: userController.Logout
	});

};