import * as Joi from 'joi';

export const cacheValidationSchema = {
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().required(),
  REDIS_CACHE_TTL: Joi.number().default(900),
  REDIS_ASSETS_CACHE_TTL: Joi.number().default(900),
  REDIS_MAX_RETRIES: Joi.number().default(5),
};
