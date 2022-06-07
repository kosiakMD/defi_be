import * as Joi from 'joi';

import { registerAs } from '@nestjs/config';

const logFileRE = /[a-zA-Z1-9_.]\.log/;

export const logsConfig = registerAs('logs', () => ({
  errorFile: process.env.LOG_ERROR_FILE,
  combinedFile: process.env.LOG_COMBINED_FILE,
  level: process.env.LOG_LEVEL,
}));

export const logsValidation = {
  LOG_ERROR_FILE: Joi.string() //
    .optional()
    .allow('')
    .pattern(logFileRE),
  LOG_COMBINED_FILE: Joi.string() //
    .pattern(logFileRE)
    .required(),
  LOG_LEVEL: Joi.string() //
    .equal('debug', 'info')
    .default('info'),
  LOG_IN_JSON: Joi.string() //
    .allow('')
    .equal('true', 'false'),
  SENTRY_DSN: Joi.string().allow(''),
};
