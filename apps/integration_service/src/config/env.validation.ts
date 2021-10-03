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
  AMM_UNISWAP_V3_ETH_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AAVE_ETH_SUBGRAPH_URL: Joi.string().required(),
  AAVE_PLG_SUBGRAPH_URL: Joi.string().required(),
  AMM_SUSHISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_UNISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_PANGOLIN_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BLOCKS_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  AMM_PANCAKE_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BLOCKS_BSC_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  VAULT_SUSHISWAP_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  SPOOKYSWAP_FARM_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  SPOOKYSWAP_ACELAB_SUBGRAPH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  ETH_URL: Joi.string() //
    .required(),
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().required(),
  PRICES_PATH: Joi.string().required(),
  ACCOUNT_SERVICE_HOST: Joi.string().required(),
  ACCOUNT_SERVICE_PORT: Joi.number().required(),
  ACCOUNT_BALANCE: Joi.string().required(),
  ACCOUNT_ASSETS: Joi.string().required(),
  THEGRAPH_SUSHISWAP_STAKING_POSITIONS: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string().required(),
  REDIS_CACHE_TTL: Joi.number(),
  JOBS_CACHE_TTL_IN_SECONDS: Joi.number(),
  POOLS_CACHE_TTL_IN_SECONDS: Joi.number(),
  CHAIN_CACHE_TTL_IN_SECONDS: Joi.number(),
  CURRENCY_CACHE_TTL_IN_SECONDS: Joi.number(),
  PRICE_CACHE_TTL_IN_SECONDS: Joi.number(),
  AUTOFARM_SUBGRAPH_URL: Joi.string().required(),
  QUICKSWAP_SUBGRAPH_URL: Joi.string().required(),
  BSC_URL: Joi.string().required(),
  // TODO: Hardcoded values should be removed and made required
  AWS_REGION: Joi.string() //
    .default('eu-central-1')
    .optional(),
  // TODO: Hardcoded values should be removed and made required
  AWS_ACCESS_KEY_ID: Joi.string() //
    .default('AKIAZDKQQQWB2PUMCMK5')
    .optional(),
  // TODO: Hardcoded values should be removed and made required
  AWS_SECRET_ACCESS_KEY: Joi.string() //
    .default('ayCrJs0I5obCntfodJcT6xqqccSFEoDHw29Xt91K')
    .optional(),
  POLYGON_RPC_URL: Joi.string().required(),
  FTM_RPC_URL: Joi.string().required(),
  ALPACA_SUBGRAPH_URL: Joi.string().required(),
  ALPACA_API_URL: Joi.string().required(),
  AUTOFARM_API_URL: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
