/* eslint-disable camelcase */
import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION,
  aws_key_id: process.env.AWS_ACCESS_KEY_ID,
  aws_secret_key: process.env.AWS_SECRET_ACCESS_KEY,
  signature_version: process.env.AWS_SIGNATURE_VERSION,
  root_bucket: process.env.AWS_ROOT_BUCKET,
}));
