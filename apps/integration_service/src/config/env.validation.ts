import * as Joi from 'joi';

import { EnvEnum } from '@app/common';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal(...Object.values(EnvEnum))
    .default('local'),
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
  AAVE_AVAX_SUBGRAPH_URL: Joi.string().required(),
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
  PRICE_SERVICE_URL: Joi.string().required(),
  ACCOUNT_SERVICE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number(),
  JOBS_CACHE_TTL_IN_SECONDS: Joi.number(),
  POOLS_CACHE_TTL_IN_SECONDS: Joi.number(),
  CHAIN_CACHE_TTL_IN_SECONDS: Joi.number(),
  CURRENCY_CACHE_TTL_IN_SECONDS: Joi.number(),
  PRICE_CACHE_TTL_IN_SECONDS: Joi.number(),
  AUTOFARM_SUBGRAPH_URL: Joi.string().required(),
  QUICKSWAP_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ARBI_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  COMPOUND_ETH_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_AVAX_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_BSC_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_CELO_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ETH_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_FTM_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_HECO_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_MATIC_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_MRIVER_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_OKEX_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ONE_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_XDAI_EXCHANGE_SUBGRAPH_URL: Joi.string().required(),

  SUSHISWAP_ARBI_BENTOBOX_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_BSC_BENTOBOX_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ETH_BENTOBOX_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_PLG_BENTOBOX_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_XDAI_BENTOBOX_SUBGRAPH_URL: Joi.string().required(),

  SUSHISWAP_ETH_MASTERCHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ETH_SUSHIBAR_SUBGRAPH_URL: Joi.string().required(),

  SUSHISWAP_ARBI_MINICHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_CELO_MINICHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_MRIVER_MINICHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_ONE_MINICHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_PLG_MINICHEF_SUBGRAPH_URL: Joi.string().required(),
  SUSHISWAP_XDAI_MINICHEF_SUBGRAPH_URL: Joi.string().required(),

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

  AVAX_URL: Joi.string().required(),
  BSC_URL: Joi.string().required(),
  CELO_URL: Joi.string().required(),
  ETH_URL: Joi.string().required(),
  FTM_URL: Joi.string().required(),
  HARM_URL: Joi.string().required(),
  HECO_URL: Joi.string().required(),
  MRIVER_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  XDAI_URL: Joi.string().required(),
  SOL_URL: Joi.string().required(),

  ALPACA_SUBGRAPH_URL: Joi.string().required(),
  ALPACA_API_URL: Joi.string().required(),
  AUTOFARM_API_URL: Joi.string().required(),
  PANCAKEV2_MAIN_STAKING_SUBGRAPH_URL: Joi.string().required(),
  YEARN_ETH_SUBGRAPH_URL: Joi.string().required(),
  YEARN_FTM_SUBGRAPH_URL: Joi.string().required(),
  YEARN_V1_ETH_SUBGRAPH_URL: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
