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
  ETH_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  BSC_URL: Joi.string() //
    .allow('')
    .required(), // TODO: not empty
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().required(),
  PRICES_PATH: Joi.string().required(),
  BSCSCAN_URL: Joi.string().required(),
  BSCSCAN_KEY: Joi.string().required(),
  ETHERSCAN_URL: Joi.string().required(),
  ETHERSCAN_KEY: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
