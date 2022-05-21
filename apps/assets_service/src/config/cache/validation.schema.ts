import * as Joi from 'joi';

export const cacheValidationSchema = {
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_AUTH: Joi.string() //
    .allow('')
    .required(),
  REDIS_CACHE_TTL: Joi.number().default(900),
  // TODO: how long do we need to keep assets in cache? may be infinite or half of year is enough?
  REDIS_ASSETS_CACHE_TTL: Joi.number().default(180 * 24 * 60 * 60),
};
