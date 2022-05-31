import { join } from 'path';

import { awsConfig } from './aws/aws.config';
import { cacheConfig } from './cache/cache.config';
import { databaseConfig } from './database/database.config';
import * as validations from './env.validation';
import { httpConfig } from './http/http.config';

export const envFileDir = join(__dirname, '../../'); // level as `src`, not in

export const logFileDir = join(__dirname, '../../'); // level as `src`, not in

const config = {
  envFileDir,
  logFileDir,
  ...validations,
  load: [awsConfig, cacheConfig, databaseConfig, httpConfig],
};

export default config;
