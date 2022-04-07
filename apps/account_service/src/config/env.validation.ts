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
    .default('info'),
  SENTRY_DSN: Joi.string(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  AVALANCHE_URL: Joi.string().required(),
  ARBITRUM_URL: Joi.string().required(),
  BINANCE_URL: Joi.string().required(),
  CELO_URL: Joi.string().required(),
  ETHEREUM_URL: Joi.string().required(),
  FANTOM_URL: Joi.string().required(),
  HARMONY_URL: Joi.string().required(),
  HECO_URL: Joi.string().required(),
  MOONRIVER_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  GNOSIS_URL: Joi.string().required(),
  SOLANA_URL: Joi.string().required(),
  CARDANO_BLOCKFROST_API_KEY: Joi.string().required(),
  METIS_URL: Joi.string().required(),
  RONIN_URL: Joi.string().required(),
  TERRA_URL: Joi.string().required(),

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
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
