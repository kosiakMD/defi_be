import * as bodyParser from 'body-parser';
import { install } from 'source-map-support';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import { initContext, initLogger, initSentry, initSwagger, startApp } from '@app/common/bootstrap';

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

  initSentry();
  initContext(app);
  initLogger(app);

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  initSwagger(app);

  await startApp(app);
}

bootstrap();
