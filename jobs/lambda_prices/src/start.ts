import { config } from 'dotenv';

import lambdaHandler from './app';
import errorHandler from './utils/errorHandler';

config();

// errorHandler.bind(this, lambdaHandler)();
(async () => {
  await errorHandler(lambdaHandler);
})();
