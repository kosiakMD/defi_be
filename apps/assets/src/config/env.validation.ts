import * as Joi from 'joi';

import { logsValidation } from '@app/common/config/components';

import { awsValidationSchema } from './aws/validation.schema';
import { cacheValidationSchema } from './cache/validation.schema';
import { databaseValidationSchema } from './database/validation.schema';

export const validationSchema = Joi.object({
  DEBANK_CHAINS_LIST_URL: Joi.string() //
    .default(''),
  DEBANK_API_ACCESS_KEY: Joi.string() //
    .default(''),
  COINGECKO_TOKEN_LIST_URL: Joi.string() //
    .required(),
  COINMARKETCAP_TOKEN_LIST_URL: Joi.string() //
    .required(),
  COINMARKETCAP_GET_TOKENS_LIMIT: Joi.number() //
    .default(1000),
  COINMARKETCAP_TOKEN_LIST_LIMIT: Joi.number() //
    .default(15000),
  COINMARKETCAP_API_KEY: Joi.string() //
    .required(),
  USE_REDIS_TO_GET_ASSETS: Joi.boolean() //
    .default(true),
  ACCOUNT_SERVICE_CHAINS_LIST_URL: Joi.string() //
    .required(),
  ASSETS_QUEUE_NAME: Joi.string() //
    .default('assets'),
  ASSETS_METADATA_JOB_TYPE: Joi.string() //
    .default('metadata'),
  ASSETS_PRICE_JOB_TYPE: Joi.string() //
    .default('prices'),
  ASSETS_HISTORICAL_PRICE_JOB_TYPE: Joi.string() //
    .default('historicalPrices'),
  ASSETS_TAKE_SIZE: Joi.number() //
    .default(1000),
  ASSETS_HISTORICAL_PRICES_DEFAULT_DATE_LIMIT: Joi.number() //
    .default(1000 * 60 * 60 * 24 * 2), // about 2 Days
  ASSETS_CURRENT_PRICES_DEADLINE_TO_KEEP_IN_DATABASE: Joi.number() //
    .default(1000 * 60 * 60 * 24 * 7), // about 1 weeks
  ASSETS_CURRENT_PRICE_JOB_INTERVAL: Joi.number() //
    .default(7 * 60), // in seconds
  ASSETS_HISTORICAL_PRICE_JOB_INTERVAL: Joi.number() //
    .default(15 * 60), // in seconds
  REPROCESS_ASSET_PERIOD_MS: Joi.number() //
    .optional()
    .default(0),
  ...databaseValidationSchema,
  ...cacheValidationSchema,
  ...awsValidationSchema,
  ...logsValidation,
});

export const validationOptions = {
  abortEarly: false,
};
