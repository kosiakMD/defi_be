import * as Joi from 'joi';

import { EnvEnum } from '@app/common';

import { awsValidationSchema } from './aws/validation.schema';
import { cacheValidationSchema } from './cache/validation.schema';
import { databaseValidationSchema } from './database/validation.schema';

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
    .default('.env')
    .required(),

  SERVICE_NAME: Joi.string().default('Assets Service'),
  SERVICE_HOST: Joi.string() //
    .allow('')
    .default(''),
  SERVICE_PORT: Joi.number() //
    .default(6066),

  LOG_ERROR_FILE: Joi.string() //
    .pattern(logFileRE)
    .default('error.log'),
  LOG_COMBINED_FILE: Joi.string() //
    .pattern(logFileRE)
    .default('combined.log'),
  LOG_LEVEL: Joi.string() //
    .equal('debug', 'info')
    .default('info'),
  SENTRY_DSN: Joi.string(),
  DEBANK_CHAINS_LIST_URL: Joi.string() //
    .default(''),
  DEBANK_API_ACCESS_KEY: Joi.string() //
    .default(''),
  COINGECKO_TOKEN_LIST_URL: Joi.string() //
    .required(),
  COINMARKETCAP_TOKEN_LIST_URL: Joi.string() //
    .required(),
  COINMARKETCAP_TOKEN_LIST_LIMIT: Joi.number() //
    .default(10000),
  COINMARKETCAP_API_KEY: Joi.string() //
    .required(),
  USE_REDIS_TO_GET_ASSETS: Joi.boolean() //
    .default(true),
  ACCOUNT_SERVICE_CHAINS_LIST_URL: Joi.string() //
    .required(),
  ...databaseValidationSchema,
  ...cacheValidationSchema,
  ...awsValidationSchema,
});

export const validationOptions = {
  abortEarly: false,
};
