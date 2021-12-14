import { config } from 'dotenv';
import { join } from 'path';

import { ConfigModuleOptions } from '@nestjs/config';

import { createLogger } from '../Logger/winston';

// TODO add dependencies from env names as new string enum literal?
const envFiles = [
  '.env.development.local',
  '.env.development',
  '.env.production.local',
  '.env.production',
  '.env',
];

const envFilePath = (folder: string, file: string): string => join(folder, file);

let dotEnvInitiated = false;

const dotEnvInit = (folder: string): void => {
  for (const fileName of envFiles) {
    const path = envFilePath(folder, fileName);
    config({ path });
  }
};

export const ensureDotEnvInitiated = (folder: string): void => {
  if (!dotEnvInitiated) {
    dotEnvInit(folder);
  }
  dotEnvInitiated = true;
};

export interface Config {
  envFileDir: string;
  validationSchema?: any;
  validationOptions: Record<string, any>;
}

export const configuration = ({
  envFileDir,
  validationSchema,
  validationOptions,
}: Config): ConfigModuleOptions => ({
  cache: false,
  isGlobal: true,
  envFilePath: envFiles.map((file) => {
    return envFilePath(envFileDir, file);
  }),
  validationSchema: validationSchema,
  validationOptions: validationOptions,
  validate: (record): ConfigModuleOptions['validate'] => {
    const { error, value: validatedConfig } = validationSchema.validate(record, {
      allowUnknown: true,
      ...validationOptions,
    });
    if (error) {
      // NOTE: Environment variables validation failed, service will crash
      // We try to log as much information as possible
      const logger = createLogger(envFileDir);
      logger.error(`Config validation error: ${error.message}`, null, 'Config validation');
      throw new Error(`Config validation error: ${error.message}`);
    }
    return validatedConfig;
  },
});

export default configuration;
