import * as bodyParser from 'body-parser';
import { install } from 'source-map-support';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import { initListening } from '@app/common/bootstrap/initListening';
import { initLogger } from '@app/common/bootstrap/initLogger';
import { initPipes } from '@app/common/bootstrap/initPipes';
import { initSwagger } from '@app/common/bootstrap/initSwagger';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);
install({ environment: 'node' /*, hookRequire: process.env.NODE_ENV === 'development' */ });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  initLogger(app);
  initSwagger(app);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  initPipes(app);

  await initListening(app);
}

bootstrap();
