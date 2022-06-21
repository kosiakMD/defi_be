import * as joi from 'joi';

export const databaseValidationSchema = {
  DB_HOST: joi.string().default('localhost'),
  DB_PORT: joi.number().default(5432),
  DB_DATABASE: joi.string().default('postgres'),
  DB_USERNAME: joi.string().default('postgres'),
  DB_PASSWORD: joi.string(),
  DB_SYNC: joi.boolean().default(true),
  DB_LOGGING: joi.boolean().default(false),
  DB_SCHEMA: joi.string().default('public'),
};
