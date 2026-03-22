import type { FastifyPluginAsync } from 'fastify';
import { query } from '../../db/client.js';

export const prayerRoutes: FastifyPluginAsync = async (fastify) => {

  fastify.get('/:mosqueId', async (request, reply) => {
    const { mosqueId } = request.params as any;
    const { date } = request.query as any;
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const result = await query('SELECT * FROM prayer_times WHERE mosque_id = $1 AND date = $2', [mosqueId, targetDate]);
    if (!result.rows[0]) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Prayer times not found' } });
    }
    return reply.send({ success: true, data: result.rows[0] });
  });

  fastify.get('/:mosqueId/week', async (request, reply) => {
    const { mosqueId } = request.params as any;
    const result = await query(
      "SELECT * FROM prayer_times WHERE mosque_id = $1 AND date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '7 days' ORDER BY date ASC",
      [mosqueId]
    );
    return reply.send({ success: true, data: result.rows });
  });
};
