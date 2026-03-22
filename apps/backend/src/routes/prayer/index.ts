import type { FastifyPluginAsync } from 'fastify';
import { query } from '../../db/client.js';

export const prayerRoutes: FastifyPluginAsync = async (fastify) => {

  // GET /prayer-times/:mosqueId
  fastify.get('/:mosqueId', async (request, reply) => {
    const { mosqueId } = request.params as any;
    const { date } = request.query as any;
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    const result = await query(
      'SELECT * FROM prayer_times WHERE mosque_id = $1 AND date = $2',
      [mosqueId, targetDate]
    );
    if (!result.rows[0]) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Prayer times not found' } });
    }
    return reply.send({ success: true, data: result.rows[0] });
  });

  // GET /prayer-times/:mosqueId/week
  fastify.get('/:mosqueId/week', async (request, reply) => {
    const { mosqueId } = request.params as any;
    const result = await query(
      `SELECT * FROM prayer_times WHERE mosque_id = $1
       AND date >= CURRENT_DATE AND date < CURRENT_DATE + INTERVAL '7 days'
       ORDER BY date ASC`,
      [mosqueId]
    );
    return reply.send({ success: true, data: result.rows });
  });

  // POST /prayer-times — scraper saves prayer times
  fastify.post('/', {
    preHandler: [(fastify as any).authenticate],
  }, async (request, reply) => {
    const body = request.body as any;
    try {
      const result = await query(
        `INSERT INTO prayer_times
          (mosque_id, date, timezone, fajr, sunrise, dhuhr, asr, maghrib, isha, jumuah_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (mosque_id, date) DO UPDATE SET
           fajr = EXCLUDED.fajr,
           dhuhr = EXCLUDED.dhuhr,
           asr = EXCLUDED.asr,
           maghrib = EXCLUDED.maghrib,
           isha = EXCLUDED.isha,
           jumuah_time = EXCLUDED.jumuah_time
         RETURNING *`,
        [
          body.mosque_id, body.date, body.timezone || 'UTC',
          body.fajr, body.sunrise || '06:00', body.dhuhr,
          body.asr, body.maghrib, body.isha, body.jumuah_time || null,
        ]
      );
      return reply.status(201).send({ success: true, data: result.rows[0] });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
  });
};
