// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

import { handler } from './lambda';

(async () => {
  await handler();
})();
