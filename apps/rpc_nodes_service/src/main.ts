import * as fs from 'fs';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import { initListening } from '@app/common/bootstrap/initListening';
import { initLogger } from '@app/common/bootstrap/initLogger';
import { initPipes } from '@app/common/bootstrap/initPipes';
import { initPrefix } from '@app/common/bootstrap/initPrefix';
import { initSwagger } from '@app/common/bootstrap/initSwagger';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);

const ssl = process.env.SSL === 'true' ? true : false;
let httpsOptions = null;
if (ssl) {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
    httpsOptions,
  });

  initLogger(app);
  initSwagger(app);
  initPipes(app);
  initPrefix(app);

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
  throw e;
});
