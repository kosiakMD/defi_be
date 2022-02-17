import * as Joi from 'joi';

import { EnvEnum } from '@app/common';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

const COMMON_BALANCE_CHECKER_ADDRESS = '0x1861eb1cc764032509e4d2ff545138be0ad3b240';

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
    .default('info'),
  SENTRY_DSN: Joi.string(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  AVAX_URL: Joi.string().required(),
  ARBITRUM_URL: Joi.string().required(),
  BSC_URL: Joi.string().required(),
  CELO_URL: Joi.string().required(),
  ETH_URL: Joi.string().required(),
  FTM_URL: Joi.string().required(),
  HARM_URL: Joi.string().required(),
  HECO_URL: Joi.string().required(),
  MRIVER_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  GNOSIS_URL: Joi.string().required(),
  SOL_URL: Joi.string().required(),
  CARDANO_BLOCKFROST_API_KEY: Joi.string().required(),
  METIS_URL: Joi.string().required(),

  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().required(),
  PRICES_PATH: Joi.string().required(),
  BSCSCAN_URL: Joi.string().required(),
  BSCSCAN_KEY: Joi.string().required(),
  ETHERSCAN_URL: Joi.string().required(),
  ETHERSCAN_KEY: Joi.string().required(),
  POLYGONSCAN_URL: Joi.string().required(),
  POLYGONSCAN_KEY: Joi.string().required(),
  COVALENT_URL: Joi.string().required(),
  COVALENT_KEY: Joi.string().required(),
  PRICE_SERVICE_MAIN_COIN_ADDRESS: Joi.string().required(),
  BLOCKS_SUBGRAPH_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number(),
  REDIS_ASSETS_CACHE_TTL: Joi.number(),
  ETH_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  ETH_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  BSC_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(1500)
    .optional(),
  BSC_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  POLYGON_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  POLYGON_BALANCES_CHECKER_ADDRESS: Joi.string()
    .default('0x1502c3c8e63873b1b162ed27a218069dc1486f51')
    .optional(),
  FTM_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  FTM_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  AVAX_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  AVAX_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  ARBITRUM_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  ARBITRUM_BALANCES_CHECKER_ADDRESS: Joi.string()
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  GNOSIS_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  GNOSIS_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  CELO_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  CELO_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  MOONRIVER_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  MOONRIVER_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  HARMONY_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  HARMONY_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  HECO_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  HECO_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  OKEX_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  OKEX_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  CRONOS_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  CRONOS_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  BOBA_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  BOBA_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  KCC_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  KCC_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  OPTIMISM_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  OPTIMISM_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  NEAR_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  NEAR_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  KLAYTN_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  KLAYTN_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),
  FUSE_BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  FUSE_BALANCES_CHECKER_ADDRESS: Joi.string() //
    .default(COMMON_BALANCE_CHECKER_ADDRESS)
    .optional(),

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
  CACHE_ASSETS_TTL: Joi.number()
    .integer()
    .optional()
    .default(60 * 60),
  OPEN_SEA_URL: Joi.string().required(),
  OPEN_SEA_API_KEY: Joi.string().required(),
  OPEN_SEA_INTERVAL: Joi.number().required(),
  AAVEGOTCHI_SUBGRAPH_POLYGON: Joi.string().required(),
  AAVEGOTCHI_SUBGRAPH_SVG: Joi.string().required(),
  TERRA_URL: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
