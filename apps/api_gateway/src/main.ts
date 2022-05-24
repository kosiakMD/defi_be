import helmet from 'helmet';
import { install } from 'source-map-support';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from '@app/common/Logger/Logger.service';
import { createLogger } from '@app/common/Logger/winston';
import { initSentry, initSwagger, startApp } from '@app/common/bootstrap';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);
install({ environment: 'node' /*, hookRequire: process.env.NODE_ENV === 'development' */ });

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  initSentry();

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.use(helmet());

  initSwagger(app);

  await startApp(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
});
