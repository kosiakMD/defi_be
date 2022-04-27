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
  COINMARKETCAP_TOKEN_LIST_LIMIT: Joi.number() //
    .default(10000),
  COINMARKETCAP_API_KEY: Joi.string() //
    .required(),
  USE_REDIS_TO_GET_ASSETS: Joi.boolean() //
    .default(true),
  UPDATE_ASSET_PRICES_IN_DB: Joi.boolean() //
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
    .default(1000 * 60 * 60 * 48), // about 2 Days
  ASSETS_CURRENT_PRICES_DEADLINE_TO_KEEP_IN_DATABASE: Joi.number() //
    .default(1000 * 60 * 60 * 24 * 7), // about 2 weeks
  ...databaseValidationSchema,
  ...cacheValidationSchema,
  ...awsValidationSchema,
  ...logsValidation,
});

export const validationOptions = {
  abortEarly: false,
};
