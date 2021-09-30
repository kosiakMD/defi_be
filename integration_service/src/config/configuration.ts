import dotenv from 'dotenv';

import { ConfigModuleOptions } from '@nestjs/config';

import { createLogger } from '../utils/winston';
import validationSchema, { validationOptions } from './env.validation';

const envFilePath = [
  '.env.development.local',
  '.env.development',
  '.env.production.local',
  '.env.production',
  '.env',
];

let dotEnvInitiated = false;

const dotEnvInit = (): void => {
  for (const path of envFilePath) {
    dotenv.config({ path });
  }
};

export const ensureDotEnvInitiated = (): void => {
  if (!dotEnvInitiated) {
    dotEnvInit();
  }
  dotEnvInitiated = true;
};

export const configuration: ConfigModuleOptions = {
  cache: true,
  isGlobal: true,
  envFilePath,
  validationSchema,
  validationOptions,
  validate: (record) => {
    const { error, value: validatedConfig } = validationSchema.validate(record, {
      allowUnknown: true,
      ...validationOptions,
    });
    if (error) {
      // NOTE: Environment variables validation failed, service will crash
      // We try to log as much information as possible
      const logger = createLogger();
      logger.error(`Config validation error: ${error.message}`, null, 'Config validation');
      throw new Error(`Config validation error: ${error.message}`);
    }
    return validatedConfig;
  },
};

export default configuration;
