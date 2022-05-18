import * as bodyParser from 'body-parser';
import { install } from 'source-map-support';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import {
  initListening,
  initLogger,
  initPipes,
  initSentry,
  initSwagger,
} from '@app/common/bootstrap';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);
install({ environment: 'node' /*, hookRequire: process.env.NODE_ENV === 'development' */ });

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  initSentry();
  initLogger(app);
  initSwagger(app);
  initPipes(app);

  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
});
