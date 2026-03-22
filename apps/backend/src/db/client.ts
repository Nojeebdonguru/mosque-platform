import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  min: env.POSTGRES_POOL_MIN,
  max: env.POSTGRES_POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected Postgres pool error');
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(sql, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn({ sql: sql.slice(0, 100), duration }, 'Slow query detected');
    }
    return result;
  } catch (err) {
    logger.error({ err, sql: sql.slice(0, 100) }, 'Database query error');
    throw err;
  }
}

export async function connectDB(): Promise<void> {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  logger.info('PostgreSQL connected');
}
