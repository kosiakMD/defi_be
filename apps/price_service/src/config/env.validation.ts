import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...databaseValidation,
  ...redisValidation,
  ...awsValidation,
  BODY_LIMIT: Joi.string() //
    .default('1mb')
    .allow('')
    .required(),
  URL_LIMIT: Joi.string() //
    .default('1mb')
    .allow('')
    .required(),
  ...appValidation,
  THEGRAPH_UNISWAP_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  THEGRAPH_SUSHISWAP_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  SWAP_0X_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  ETH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BSC_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  CURRENCYLAYER_API_KEY: Joi.string().required(),
  CURRENCYLAYER_ENDPOINT: Joi.string() //
    .default('http://api.currencylayer.com/live')
    .optional(),
  CACHE_HISTORIC_PRICES_TTL_IN_SECONDS: Joi.number() //
    .integer()
    .optional()
    .default(172800), // 48 hours
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
