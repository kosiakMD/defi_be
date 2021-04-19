import validationSchema from './env.validation';

export const configuration = {
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
};

export default configuration;
