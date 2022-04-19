import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from '@app/common/Logger/Logger.service';
import { createLogger } from '@app/common/Logger/winston';
import { initSwagger } from '@app/common/bootstrap/initSwagger';
import { startApp } from '@app/common/bootstrap/startApp';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);

async function bootstrap(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: false,
    logger: logger,
  });

  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('v1'); // temporary global as only 1 version

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  initSwagger(app);

  return await startApp(app);
}

bootstrap();
