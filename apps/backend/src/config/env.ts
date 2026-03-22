import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.string().default('info'),
  API_PREFIX: z.string().default('/api/v1'),
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default('mosque_platform'),
  POSTGRES_USER: z.string().default('mosque_user'),
  POSTGRES_PASSWORD: z.string().default('dev_password'),
  POSTGRES_POOL_MIN: z.coerce.number().default(2),
  POSTGRES_POOL_MAX: z.coerce.number().default(10),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('backend'),
  KAFKA_GROUP_ID: z.string().default('backend-consumers'),
  JWT_SECRET: z.string().default('dev_secret_min_32_chars_change_in_production_now'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
