import type { FastifyInstance } from 'fastify';
import { mosqueRoutes } from './mosque/index.js';
import { userRoutes } from './user/index.js';
import { prayerRoutes } from './prayer/index.js';
import { env } from '../config/env.js';
import { pool } from '../db/client.js';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  const prefix = env.API_PREFIX;

  server.get('/health', async (request, reply) => {
    let dbStatus = 'ok';
    try {
      await pool.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }
    return reply.send({
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      version: '1.0.0',
      uptime: Math.round(process.uptime()),
      checks: { database: dbStatus },
    });
  });

  await server.register(mosqueRoutes, { prefix: prefix + '/mosques' });
  await server.register(userRoutes,   { prefix: prefix + '/auth' });
  await server.register(prayerRoutes, { prefix: prefix + '/prayer-times' });

  server.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  server.setErrorHandler((error, request, reply) => {
    server.log.error({ err: error }, 'Unhandled error');
    const msg = env.NODE_ENV === 'development' ? error.message : 'Internal server error';
    reply.status(error.statusCode ?? 500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: msg },
    });
  });
}
