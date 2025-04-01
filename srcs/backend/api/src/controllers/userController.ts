// src/controllers/userController.ts
import { getUsers, createUser } from '../models/userModel';
import { FastifyRequest, FastifyReply } from 'fastify';

export const getAllUsers = async (request: FastifyRequest, reply: FastifyReply) => {
  const users = getUsers();
  return reply.send(users);
};

export const createNewUser = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.body as { name: string; email: string };
  const newUser = createUser(user);
  return reply.status(201).send(newUser);
};
