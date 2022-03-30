import * as joi from 'joi';

export const databaseValidationSchema = {
  DB_HOST: joi.string().default('localhost'),
  DB_PORT: joi.number().default(5432),
  DB_NAME: joi.string().default('postgres'),
  DB_USERNAME: joi.string().default('postgres'),
  DB_PASSWORD: joi.string(),
};
