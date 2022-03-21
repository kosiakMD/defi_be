/* eslint-disable prettier/prettier */
import config from './utils/config';
import { lambdaHandler } from './app';
/** should be before other imports */
config(__dirname, '../.env');

/**
 * @description temporarily disable error handler
 * :TODO: import errorHandler from './utils/errorHandler';
 */


// errorHandler.bind(this, lambdaHandler)();
(async () => {
  await lambdaHandler();
})();
