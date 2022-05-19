import * as Joi from 'joi';

export const cacheValidationSchema = {
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number().default(900),
  REDIS_ASSETS_CACHE_TTL: Joi.number().default(900),
};
