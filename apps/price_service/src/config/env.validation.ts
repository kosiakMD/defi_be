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
  SERVICE_NAME: Joi.string().required(),
  SERVICE_HOST: Joi.string() //
    .allow('')
    .required(),
  SERVICE_PORT: Joi.number() //
    .default(3000)
    .required(),
  BODY_LIMIT: Joi.string() //
    .default('1mb')
    .allow('')
    .required(),
  URL_LIMIT: Joi.string() //
    .default('1mb')
    .allow('')
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
  REDIS_HOST: Joi.string() //
    .required(),
  REDIS_PORT: Joi.string() //
    .required(),
  REDIS_AUTH: Joi.string() //
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
  THEGRAPH_UNISWAP_ENDPOINT: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  THEGRAPH_SUSHISWAP_ENDPOINT: Joi.string() //
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
  CURRENCYLAYER_API_KEY: Joi.string().required(),
  CURRENCYLAYER_ENDPOINT: Joi.string() //
    .default('http://api.currencylayer.com/live')
    .optional(),
  CACHE_HISTORIC_PRICES_TTL_IN_SECONDS: Joi.number() //
    .integer()
    .optional()
    .default(172800), // 48 hours
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
