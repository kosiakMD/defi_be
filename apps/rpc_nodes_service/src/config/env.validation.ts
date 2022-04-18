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
