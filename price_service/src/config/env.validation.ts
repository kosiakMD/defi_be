import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal('development', 'production', 'test', 'provision')
    .default('development'),
  ENV: Joi.string().equal(
    '.env',
    '.env.production',
    '.env.production.local',
    '.env.development',
    '.env.development.local',
  ),
  SERVICE_NAME: Joi.string(),
  SERVICE_HOST: Joi.string().empty(''),
  SERVICE_PORT: Joi.number().default(3000),
  LOG_ERROR_FILE: Joi.string().pattern(/[a-z,A-Z,1-9_.]\.log/),
  LOG_COMBINED_FILE: Joi.string().pattern(/[a-z,A-Z,1-9_.]\.log/),
  LOG_LEVEL: Joi.string() //
    .equal('debug', 'info')
    .default('info'),
  DB_CONNECTION: Joi.string(),
  DB_HOST: Joi.string(),
  DB_USERNAME: Joi.string(),
  DB_PORT: Joi.number().default(5432),
  DB_PASSWORD: Joi.string(),
  DB_DATABASE: Joi.string(),
  DB_SYNCHRONIZE: Joi.boolean(),
  DB_LOGGING: Joi.boolean(),
  THEGRAPH_UNISWAP_ENDPOINT: Joi.string().empty(''), // TODO: not empty
  THEGRAPH_SUSHISWAP_ENDPOINT: Joi.string().empty(''), // TODO: not empty
  THEGRAPH_CURVE_ENDPOINT: Joi.string().empty(''), // TODO: not empty
  THEGRAPH_BALANCER_ENDPOINT: Joi.string().empty(''), // TODO: not empty
  SWAP_0X_ENDPOINT: Joi.string().empty(''), // TODO: not empty
  ETH_URL: Joi.string().empty(''), // TODO: not empty
  BSC_URL: Joi.string().empty(''), // TODO: not empty
});

export const validationOptions = {
  // allowUnknown: false,
};

export default validationSchema;
