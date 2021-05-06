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
  DB_HOST: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().required(),
  DB_LOGGING: Joi.boolean().required(),
  AMM_SUSHISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_UNISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BLOCKS_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_PANCAKE_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_CURVE_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BLOCKS_BSC_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  VAULT_SUSHISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  ETH_URL: Joi.string() //
    .required(),
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().required(),
  PRICES_PATH: Joi.string().required(),
  THEGRAPH_SUSHISWAP_STAKING_POSITIONS: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
