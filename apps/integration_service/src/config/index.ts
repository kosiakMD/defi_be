import { join } from 'path';

import * as validations from './env.validation';

export const envFileDir = join(__dirname, '../../'); // level as `src`, not in

export const logFileDir = join(__dirname, '../../'); // level as `src`, not in

const config = {
  envFileDir,
  logFileDir,
  ...validations,
};
export default config;
