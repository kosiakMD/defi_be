import axios from 'axios';

import { method, endpoint as url, data } from './config';
import { logger } from './utils/logger';
import { time } from './utils/timing';

export async function process() {
  await time(async (getTime) => {
    try {
      logger.info('Beginning Schedule');

      await axios.request({ url, method, data });

      logger.info(`Schedule Success in ${getTime()}ms`);
    } catch (e) {
      logger.info(`Schedule Failed after ${getTime()}ms`);
      logger.error(e);
    }
  });
}
