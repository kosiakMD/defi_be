import validationSchema, { validationOptions } from './env.validation';

export const configModuleConfiguration = {
  cache: true,
  isGlobal: true,
  envFilePath: [
    '.env.development.local',
    '.env.development',
    '.env.production.local',
    '.env.production',
    '.env',
  ],
  validationSchema,
  validationOptions,
};

export default configModuleConfiguration;
