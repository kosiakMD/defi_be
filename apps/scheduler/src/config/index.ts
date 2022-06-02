import { join } from 'path';

import {
  appConfig,
  awsConfig,
  databaseConfig,
  httpConfig,
  logsConfig,
  redisConfig,
} from '@app/common/config/components';

import * as validations from './env.validation';

export const envFileDir = join(__dirname, '../../'); // level as `src`, not in

export const logFileDir = join(__dirname, '../../'); // level as `src`, not in

const config = {
  envFileDir,
  logFileDir,
  ...validations,
  load: [
    appConfig, //
    awsConfig,
    databaseConfig,
    logsConfig,
    redisConfig,
    httpConfig,
  ],
};

export default config;
