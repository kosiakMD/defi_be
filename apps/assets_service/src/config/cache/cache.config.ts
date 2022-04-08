import { registerAs } from '@nestjs/config';

export const cacheConfig = registerAs('cache', () => ({
  host: process.env.REDIS_HOST,
  port: +process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  ttl: process.env.REDIS_CACHE_TTL,
  assetsTtl: process.env.REDIS_ASSETS_CACHE_TTL,
  maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES,
}));
