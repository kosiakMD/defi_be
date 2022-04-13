import { config } from 'dotenv';
import { join } from 'path';

import { logger } from './logger';

const conf = (...paths: string[]): void => {
  const envFileDir = join(...paths);

  const conf = config({ path: envFileDir });
  if (conf.error) {
    throw conf.error;
  } else {
    logger.info(JSON.stringify(conf.parsed));
  }
};

export default conf;
