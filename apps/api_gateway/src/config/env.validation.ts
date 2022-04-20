import * as Joi from 'joi';

import {
  appValidation,
  awsValidation,
  logsValidation,
  redisValidation,
} from '@app/common/config/components';

export const validationSchema = Joi.object({
  ...appValidation,
  ...logsValidation,
  ...redisValidation,
  ...awsValidation,

  DEFIYIELD_INFO_2_URL: Joi.string().required(),
  GAS_HISTORY_PATH: Joi.string().required(),
  GAS_API_URL: Joi.string().required(),
  GAS_CURRENT_PATH: Joi.string().required(),
  GAS_API_KEY: Joi.string().required(),
  // ACCOUNT
  ACCOUNT_SERVICE_HOST: Joi.string().required(),
  ACCOUNT_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),

  VAULTS_PATH: Joi.string().required(),
  // OPPORTUNITIES SERVICE
  OPPORTUNITIES_SERVICE_HOST: Joi.string() //
    .required(),
  OPPORTUNITIES_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  // PRICE
  PRICE_SERVICE_HOST: Joi.string().required(),
  PRICE_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  PRICES_PATH: Joi.string().required(),
  PRICE_SERVICE_MAIN_COIN_ADDRESS: Joi.string().required(),
  // INTEGRATION
  INTEGRATION_SERVICE_HOST: Joi.string().required(),
  INTEGRATION_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  // SAFE
  SAFE_PROXY_SERVICE_HOST: Joi.string().required(),
  SAFE_PROXY_SERVICE_PORT: Joi.number() //
    .allow('')
    .required(),
  // EXTERNAL API'S
  ETHERSCAN_API_URL: Joi.string().required(),
  ETHERSCAN_API_KEY: Joi.string().required(),
  BSCSCAN_API_URL: Joi.string().required(),
  BSCSCAN_API_KEY: Joi.string().required(),
  SOLANA_NAME_SERVICE_PUBLIC_KEY: Joi.string().required(),
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().required(),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number(),
  // E-MAILS
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
});

export const validationOptions = {
  abortEarly: false,
};

export default validationSchema;
