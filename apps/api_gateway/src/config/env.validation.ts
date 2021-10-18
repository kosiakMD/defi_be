import * as Joi from 'joi';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .equal('development', 'production', 'test', 'provision', 'local')
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
  // SERVICE
  SERVICE_NAME: Joi.string().required(),
  SERVICE_HOST: Joi.string() //
    .allow('')
    .required(),
  SERVICE_PORT: Joi.number().default(3000),
  // LOG
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
  DEFIYIELD_INFO_2_URL: Joi.string().required(),
  TOKENS_PATH: Joi.string().required(),
  GAS_HISTORY_PATH: Joi.string().required(),
  DEFIYIELD_INFO_MAIN_URL: Joi.string().required(),
  APPROVALS_PATH: Joi.string().required(),
  GAS_API_URL: Joi.string().required(),
  GAS_CURRENT_PATH: Joi.string().required(),
  // ACCOUNT
  ACCOUNT_SERVICE_HOST: Joi.string().required(),
  ACCOUNT_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  ACCOUNT_STATUS: Joi.string().required(),
  ACCOUNT_TRANSACTIONS: Joi.string().required(),
  ACCOUNT_TRANSFERS: Joi.string().required(),
  ACCOUNT_BALANCE: Joi.string().required(),
  ACCOUNT_24H_RETURNS: Joi.string().required(),
  ACCOUNT_APPROVALS: Joi.string().required(),
  ACCOUNT_ASSETS: Joi.string().required(),
  POOLS_PATH: Joi.string().required(),
  VAULTS_PATH: Joi.string().required(),
  // PRICE
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  PRICE_STATUS: Joi.string().required(),
  PRICES_PATH: Joi.string().required(),
  PRICE_CHAINS_PATH: Joi.string().required(),
  PRICE_CURRENCIES_PATH: Joi.string().required(),
  PRICE_BATCH_PATH: Joi.string().required(),
  PRICE_RANGE_PATH: Joi.string().required(),
  PRICE_SERVICE_MAIN_COIN_ADDRESS: Joi.string().required(),
  // INTEGRATION
  INTEGRATION_SERVICE_HOST: Joi.string().required(),
  INTEGRATION_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  INTEGRATION_STATUS: Joi.string().required(),
  INTEGRATION_UNISWAP: Joi.string().required(),
  INTEGRATION_SUSHISWAP: Joi.string().required(),
  INTEGRATION_SPOOKYSWAP: Joi.string().required(),
  INTEGRATION_PANCAKE: Joi.string().required(),
  INTEGRATION_PANGOLIN: Joi.string().required(),
  INTEGRATION_PROTOCOLS: Joi.string().required(),
  INTEGRATION_NFT_ASSETS: Joi.string().required(),
  // SAFE
  SAFE_PROXY_SERVICE_HOST: Joi.string().required(),
  SAFE_PROXY_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  SAFE_PROXY_STATUS: Joi.string().required(),
  SAFE_PROXY_NETWORKS: Joi.string().required(),
  SAFE_PROXY_PARTNERS: Joi.string().required(),
  SAFE_PROXY_PROJECTS: Joi.string().required(),
  SAFE_PROXY_SCAMS: Joi.string().required(),
  SAFE_PROXY_SCAM_TYPES: Joi.string().required(),
  SAFE_PROXY_SCAM_FUNCTIONS: Joi.string().required(),
  // EXTERNAL API'S
  ETHERSCAN_API_URL: Joi.string().required(),
  ETHERSCAN_API_KEY: Joi.string().required(),
  BSCSCAN_API_URL: Joi.string().required(),
  BSCSCAN_API_KEY: Joi.string().required(),
  //  TODO: temporary
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string().required(),
  REDIS_CACHE_TTL: Joi.number(),
  // e-mails
  MAILER_HOST: Joi.string() //
    .allow('')
    .required(),
  MAILER_USER: Joi.string() //
    .allow('')
    .required(),
  MAILER_PASS: Joi.string() //
    .allow('')
    .required(),
  MAIL_HIRE_FROM: Joi.string() //
    .allow('')
    .required(),
  MAIL_HIRE_TO: Joi.string() //
    .allow('')
    .required(),
  MAIL_QUESTION_FROM: Joi.string() //
    .allow('')
    .required(),
  MAIL_QUESTION_TO: Joi.string() //
    .allow('')
    .required(),
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
  // allowUnknown: false,
};

export default validationSchema;
