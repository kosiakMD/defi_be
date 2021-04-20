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
  DB_HOST: Joi.string(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string(),
  DB_PASSWORD: Joi.string(),
  DB_DATABASE: Joi.string(),
  ETH_URL: Joi.string().empty(''), // TODO: not empty
  BSC_URL: Joi.string().empty(''), // TODO: not empty
});

export const validationOptions = {
  allowUnknown: false,
};

export default validationSchema;
