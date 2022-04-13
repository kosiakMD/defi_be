import { config } from 'dotenv';

import handler from './lambda';
import errorHandler from './utils/errorHandler';

config();

// errorHandler.bind(this, handler)();
(async () => {
  await errorHandler(handler);
})();
