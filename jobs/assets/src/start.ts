import { lambdaHandler } from './app';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

(async () => {
  await lambdaHandler();
})();
