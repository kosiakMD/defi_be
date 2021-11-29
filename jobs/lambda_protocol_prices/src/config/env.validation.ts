import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal('development', 'production', 'test', 'provision', 'local')
    .default('local'),
  ENV: Joi.string() //
    .equal('.env')
    .required(),
  CHAIN_ID: Joi.string().required(),
  RPC_URL: Joi.string().required(),
  MULTICALL_CONTRACT: Joi.string().required(),
  ACCOUNT_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_HOST: Joi.string().required(),
  LOG_ERROR_FILE: Joi.string().required(),
  LOG_COMBINED_FILE: Joi.string().required(),
  LOG_LEVEL: Joi.string().required(),
  SERVICE_NAME: Joi.string().required(),
  AWS_REGION: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
});
