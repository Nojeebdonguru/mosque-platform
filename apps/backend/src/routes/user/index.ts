import type { FastifyPluginAsync } from 'fastify';
import { authService } from '../../services/auth.service.js';

export const userRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.post('/register', async (request, reply) => {
    try {
      const user = await authService.register(request.body as any);
      const token = fastify.jwt.sign({ id: user.id, role: user.role });
      return reply.status(201).send({ success: true, data: { user: authService.formatUser(user), accessToken: token } });
    } catch (err: any) {
      return reply.status(409).send({ success: false, error: { code: 'DUPLICATE', message: err.message } });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;
    const user = await authService.login(email, password);
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }
    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    return reply.send({ success: true, data: { user: authService.formatUser(user), accessToken: token } });
  });

  fastify.get('/me', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const { id } = (request as any).user;
    const user = await authService.findById(id);
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    return reply.send({ success: true, data: authService.formatUser(user) });
  });
};
