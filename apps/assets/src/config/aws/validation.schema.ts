import * as Joi from 'joi';

export const awsValidationSchema = {
  AWS_REGION: Joi.string().default('eu-central-1'),
  AWS_ACCESS_KEY_ID: Joi.string(),
  AWS_SECRET_ACCESS_KEY: Joi.string(),
  AWS_SIGNATURE_VERSION: Joi.number().default(4),
  AWS_ROOT_BUCKET: Joi.string().default('defiyield-static'),
};
