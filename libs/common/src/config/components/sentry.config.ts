import * as Joi from 'joi';

export const sentryValidation = {
  SENTRY_DSN: Joi.string(),
};
