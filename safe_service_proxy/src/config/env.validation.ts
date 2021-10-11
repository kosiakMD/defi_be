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
  AWS_REGION: Joi.string() //
    .required(),
  AWS_ACCESS_KEY_ID: Joi.string() //
    .required(),
  AWS_SECRET_ACCESS_KEY: Joi.string() //
    .required(),

  SAFE_API_URL: Joi.string() //
    .required(),
  SAFE_API_NETWORKS: Joi.string() //
    .required(),
  SAFE_API_PARTNERS: Joi.string() //
    .required(),
  SAFE_API_PROJECTS: Joi.string() //
    .required(),
  SAFE_API_SCAMS: Joi.string() //
    .required(),
  SAFE_API_SCAM_TYPES: Joi.string() //
    .required(),
  SAFE_API_SCAM_FUNCTIONS: Joi.string() //
    .required(),
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
