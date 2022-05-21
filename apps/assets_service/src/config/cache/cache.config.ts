import { registerAs } from '@nestjs/config';

export const cacheConfig = registerAs('cache', () => ({
  host: process.env.REDIS_HOST,
  port: +process.env.REDIS_PORT,
  password: process.env.REDIS_AUTH,
  ttl: +process.env.REDIS_CACHE_TTL,
  assetsTtl: +process.env.REDIS_ASSETS_CACHE_TTL,
}));
