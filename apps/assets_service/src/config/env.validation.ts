import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

import { awsValidationSchema } from './aws/validation.schema';
import { cacheValidationSchema } from './cache/validation.schema';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...databaseValidation,
  ...redisValidation,
  ...awsValidation,
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
  ...cacheValidationSchema,
  ...awsValidationSchema,
});

export const validationOptions = {
  abortEarly: false,
};
