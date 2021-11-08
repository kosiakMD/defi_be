import { config } from 'dotenv';
config();

import { lambdaHandler } from './app';

(async () => {
  await lambdaHandler();
})();
