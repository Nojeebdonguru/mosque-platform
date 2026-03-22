import type { FastifyPluginAsync } from 'fastify';
import { mosqueService } from '../../services/mosque.service.js';

export const mosqueRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/', async (request, reply) => {
    const filters = request.query as any;
    const result = await mosqueService.search(filters);
    return reply.send({ success: true, ...result });
  });

  fastify.get('/nearby', async (request, reply) => {
    const q = request.query as any;
    const mosques = await mosqueService.findNearby(q.lat, q.lng, q.radiusKm ?? 5, q.limit ?? 10);
    return reply.send({ success: true, data: mosques });
  });

  fastify.get('/stats', async (request, reply) => {
    const stats = await mosqueService.getStats();
    return reply.send({ success: true, data: stats });
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const mosque = await mosqueService.findById(id);
    if (!mosque) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Mosque not found' } });
    }
    return reply.send({ success: true, data: mosque });
  });

  fastify.post('/', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const user = (request as any).user;
    const mosque = await mosqueService.create(request.body, user.id);
    return reply.status(201).send({ success: true, data: mosque });
  });

  fastify.patch('/:id', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const user = (request as any).user;
    try {
      const mosque = await mosqueService.update(id, request.body, user);
      return reply.send({ success: true, data: mosque });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  });

  fastify.delete('/:id', { preHandler: [(fastify as any).authenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    await mosqueService.delete(id);
    return reply.status(204).send();
  });
};
