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
  POOLS_SERVICE_URL: Joi.string(),
  POOLS_PATH: Joi.string(),
  VAULTS_SERVICE_URL: Joi.string(),
  VAULTS_PATH: Joi.string(),
  DEFIYIELD_INFO_2_URL: Joi.string(),
  TOKENS_PATH: Joi.string(),
  GAS_HISTORY_PATH: Joi.string(),
  DEFIYIELD_INFO_MAIN_URL: Joi.string(),
  APPROVALS_PATH: Joi.string(),
  GAS_API_URL: Joi.string(),
  GAS_CURRENT_PATH: Joi.string(),
  ACCOUNT_SERVICE_HOST: Joi.string(),
  ACCOUNT_SERVICE_PORT: Joi.string(),
  ACCOUNT_STATUS: Joi.string(),
  ACCOUNT_TRANSACTIONS: Joi.string(),
  ACCOUNT_TRANSFERS: Joi.string(),
  ACCOUNT_BALANCE: Joi.string(),
  ACCOUNT_APPROVALS: Joi.string(),
  PRICE_SERVICE_HOST: Joi.string(),
  PRICE_SERVICE_PORT: Joi.string(),
  PRICE_STATUS: Joi.string(),
  PRICES_PATH: Joi.string(),
  PRICE_CHAINS_PATH: Joi.string(),
  PRICE_CURRENCIES_PATH: Joi.string(),
  INTEGRATION_SERVICE_HOST: Joi.string(),
  INTEGRATION_SERVICE_PORT: Joi.string(),
  INTEGRATION_STATUS: Joi.string(),
  INTEGRATION_UNISWAP: Joi.string(),
  INTEGRATION_SUSHISWAP: Joi.string(),
  INTEGRATION_BALANCER: Joi.string(),
  INTEGRATION_CURVE: Joi.string(),
});

export const validationOptions = {
  // allowUnknown: false,
};

export default validationSchema;
