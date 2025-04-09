// src/routes/userRoutes.ts
import { FastifyInstance } from 'fastify';
import { getAllUsers } from '../controllers/userController';
import { userSchema } from '../schemas/userSchema';

export default async (fastify: FastifyInstance) => {
  fastify.get('/', getAllUsers);

//   fastify.post('/', {
//     schema: {
//       body: userSchema
//     },
//     handler: createNewUser
//   });
};
