/* eslint-disable prettier/prettier */
import config from './utils/config';
/** config should be before other imports */
config(__dirname, '../.env');

import { lambdaHandler } from './app';
/**
 * @description temporarily disable error handler
 * :TODO: import errorHandler from './utils/errorHandler';
 */


// errorHandler.bind(this, lambdaHandler)();
(async () => {
  await lambdaHandler();
})();
