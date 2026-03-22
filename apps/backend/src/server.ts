import 'dotenv/config';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';
import { logger } from './utils/logger.js';

const server = Fastify({
  logger:
    env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
      : true,
  requestIdHeader: 'x-request-id',
  genReqId: () => crypto.randomUUID(),
  trustProxy: true,
});

async function start() {
  try {
    await registerPlugins(server);
    await registerRoutes(server);

    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`API docs: http://localhost:${env.PORT}/docs`);

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down...`);
      await server.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
