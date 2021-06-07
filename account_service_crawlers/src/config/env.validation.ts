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
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number().required(),
  PRICES_PATH: Joi.string().required(),
  PRICE_SERVICE_MAIN_COIN_ADDRESS: Joi.string().required(),
  ETH_BLOCKS_MIGRATION_STEP: Joi.number() //
    .default(5)
    .required(),
  MONGO_CONNECTION_STRING: Joi.string().required(),
  BSC_BLOCKS_MIGRATION_STEP: Joi.number() //
    .default(5)
    .required(),

  RABBITMQ_URL: Joi.string().required(),
  ASSET_MIGRATION_QUEUE: Joi.string().required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
