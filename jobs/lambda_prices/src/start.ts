import { config } from 'dotenv';

import { lambdaHandler } from './app';

config();

(async () => {
  await lambdaHandler();
})();
