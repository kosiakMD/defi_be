import * as Joi from 'joi';

import { EnvEnum } from '@app/common';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal(...Object.values(EnvEnum))
    .default('local'),
  ENV: Joi.string()
    .equal(
      '.env',
      '.env.production',
      '.env.production.local',
      '.env.development',
      '.env.development.local',
    )
    .required(),

  SERVICE_NAME: Joi.string().required(),
  SERVICE_HOST: Joi.string() //
    .allow('')
    .required(),
  SERVICE_PORT: Joi.number() //
    .default(3000)
    .required(),

  LOG_ERROR_FILE: Joi.string() //
    .pattern(logFileRE)
    .required(),
  LOG_COMBINED_FILE: Joi.string() //
    .pattern(logFileRE)
    .required(),
  LOG_LEVEL: Joi.string() //
    .equal('debug', 'info')
    .default('info'),
  SENTRY_DSN: Joi.string(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number(),
  REDIS_ASSETS_CACHE_TTL: Joi.number(),

  ENDPOINTS_SUCCESS_RATE_TTL: Joi.number()
    .integer()
    .default(300 * 1000),
  ENDPOINTS_SUCCESS_RATE_MAX_ITEMS_NUM: Joi.number() //
    .integer()
    .default(100),
  ENDPOINTS_SUCCESS_RATE_HISTORY_TTL: Joi.number()
    .integer()
    .default(60 * 60 * 1000),

  RPC_NODES_MAX_RETRIES: Joi.number() //
    .integer()
    .default(3),
  SSL: Joi.string() //
    .default('false'),
  SSL_KEY_PATH: Joi.string() //
    .default('.ssl/dev.local+3-key.pem'),
  SSL_CERT_PATH: Joi.string() //
    .default('.ssl/dev.local+3.pem'),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
