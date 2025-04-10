// src/controllers/userController.ts
import { getUsers, User } from '../models/userModel';
import { FastifyRequest, FastifyReply } from 'fastify';

export const getAllUsers = async (req: FastifyRequest, reply: FastifyReply) => {
	const users = await getUsers()
	//   prendre le 1er utilisateur
	const user = users[0];
	req.session.user = user;

	return reply.send(users);
};

// export const createNewUser = async (request: FastifyRequest, reply: FastifyReply) => {
//   const user = request.body as { name: string; email: string };
//   const newUser = createUser(user);
//   return reply.status(201).send(newUser);
// };
