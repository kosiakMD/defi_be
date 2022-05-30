import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  databaseValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...databaseValidation,
  ...redisValidation,
  ...awsValidation,
  CACHE_ASSETS_TTL: Joi.number()
    .integer()
    .optional()
    .default(60 * 60),

  ARBITRUM_URL: Joi.string().required(),
  AVALANCHE_URL: Joi.string().required(),
  BINANCE_URL: Joi.string().required(),
  BOBA_URL: Joi.string().required(),
  CARDANO_BLOCKFROST_API_KEY: Joi.string().required(),
  CARDANO_URL: Joi.string().required(),
  CELO_URL: Joi.string().required(),
  CRONOS_URL: Joi.string().required(),
  ETHEREUM_URL: Joi.string().required(),
  FANTOM_URL: Joi.string().required(),
  GNOSIS_URL: Joi.string().required(),
  HARMONY_URL: Joi.string().required(),
  HECO_URL: Joi.string().required(),
  KUCOIN_URL: Joi.string().required(),
  METIS_URL: Joi.string().required(),
  MOONRIVER_URL: Joi.string().required(),
  NEAR_URL: Joi.string().required(),
  OKEX_URL: Joi.string().required(),
  OPTIMISM_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  RONIN_URL: Joi.string().required(),
  SOLANA_URL: Joi.string().required(),
  TERRA_URL: Joi.string().required(),
  TERRA_DELEGATION_API_URL: Joi.string().required(),
  SOLANA_DELEGATION_API_URL: Joi.string().required(),
  CARDANO_DELEGATION_API_URL: Joi.string().required(),
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().optional(),
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

  OPEN_SEA_URL: Joi.string().required(),
  OPEN_SEA_API_KEY: Joi.string().required(),
  OPEN_SEA_INTERVAL: Joi.number().required(),
  AAVEGOTCHI_SUBGRAPH_POLYGON: Joi.string().required(),
  AAVEGOTCHI_SUBGRAPH_SVG: Joi.string().required(),
  ASSETS_SERVICE_HOST: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
