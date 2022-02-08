import * as redisStore from 'cache-manager-redis-store';

import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  store: redisStore,
  ttl: process.env.REDIS_CACHE_TTL,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  auth: process.env.REDIS_AUTH,
}));
