import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';
import { connectDB } from '../db/client.js';
import { logger } from '../utils/logger.js';

export async function registerPlugins(server: FastifyInstance): Promise<void> {
  await server.register(helmet, { contentSecurityPolicy: false });

  await server.register(cors, {
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await server.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await server.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await server.register(swagger, {
    openapi: {
      info: { title: 'Mosque Platform API', version: '1.0.0' },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/docs',
  });

  server.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
    }
  });

  try {
    await connectDB();
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
  }

  logger.info('All plugins registered');
}
