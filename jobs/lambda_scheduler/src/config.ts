import type { Method } from 'axios';
import { config } from 'dotenv';

import { logger } from './utils/logger';

config();

// App Config
export const method = (process.env.HTTP_METHOD || 'GET') as Method;
export const endpoint = process.env.HTTP_ENDPOINT;

// Optional stringified body for PUT/POST/DELETE/PATCH
export const data = process.env.HTTP_BODY_DATA || '';

(function validateConfig() {
  if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
    logger.error(`Invalid Method: ${method}`);
    throw new Error('Invalid METHOD supplied');
  }

  // throws on invalid URL's
  if (!endpoint.startsWith('http')) {
    logger.error(`Invalid Endpoint: ${endpoint}`);
    throw new Error('Invalid URL supplied');
  }
})();
