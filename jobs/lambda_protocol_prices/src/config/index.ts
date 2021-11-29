import { ConfigModuleOptions } from '@nestjs/config';

import { validationSchema } from './env.validation';

export function lambdaConfiguration(): ConfigModuleOptions {
  return {
    cache: true,
    isGlobal: true,
    ignoreEnvFile: true,
    validationSchema: validationSchema,
  };
}
