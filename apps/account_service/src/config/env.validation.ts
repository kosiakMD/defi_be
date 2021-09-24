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
    .default('info'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number() //
    .default(5432)
    .required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),
  ETH_URL: Joi.string().required(),
  BSC_URL: Joi.string().required(),
  POLYGON_URL: Joi.string().required(),
  FTM_URL: Joi.string().required(),
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
  REDIS_AUTH: Joi.string().required(),
  REDIS_CACHE_TTL: Joi.number(),
  BALANCES_CHECKER_BATCH_SIZE: Joi.number() //
    .default(3000)
    .optional(),
  ETH_BALANCES_CHECKER_ADDRESS: Joi.string().optional(),
  BSC_BALANCES_CHECKER_ADDRESS: Joi.string().optional(),
  POLYGON_BALANCES_CHECKER_ADDRESS: Joi.string()
    .default('0x1502c3c8e63873b1b162ed27a218069dc1486f51')
    .optional(),
  FTM_BALANCES_CHECKER_ADDRESS: Joi.string().optional(),
  AVAX_BALANCES_CHECKER_ADDRESS: Joi.string().optional(),
  ARBITRUM_BALANCES_CHECKER_ADDRESS: Joi.string().optional(),
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
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
