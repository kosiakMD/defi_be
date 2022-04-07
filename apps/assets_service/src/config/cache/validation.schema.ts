import * as Joi from 'joi';

export const cacheValidationSchema = {
  REDIS_HOST: Joi.string(),
  REDIS_PORT: Joi.number(),
  REDIS_AUTH: Joi.string().allow(''),
  REDIS_CACHE_TTL: Joi.number(),
  REDIS_ASSETS_CACHE_TTL: Joi.number(),
};
