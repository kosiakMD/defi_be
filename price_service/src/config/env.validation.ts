import * as Joi from 'joi';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal('development', 'production', 'test', 'provision')
    .default('development'),
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
    .default('info')
    .required(),
  DB_CONNECTION: Joi.string().required(),
  DB_HOST: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().required(),
  DB_LOGGING: Joi.boolean().required(),
  THEGRAPH_UNISWAP_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  THEGRAPH_SUSHISWAP_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  THEGRAPH_CURVE_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  THEGRAPH_BALANCER_ENDPOINT: Joi.string() //
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
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
