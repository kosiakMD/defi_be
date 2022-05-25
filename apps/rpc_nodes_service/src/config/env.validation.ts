import * as Joi from 'joi';

import {
  appValidation,
  databaseValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...databaseValidation,
  ...redisValidation,
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
  BODY_LIMIT: Joi.string() //
    .default('10mb'),
  URL_LIMIT: Joi.string() //
    .default('10mb'),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
