import { json, urlencoded } from 'express';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import {
  initContext,
  initListening,
  initLogger,
  initMiddlewares,
  initPipes,
  initPrefix,
  initSentry,
  initSwagger,
} from '@app/common/bootstrap';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    abortOnError: false,
    logger: logger,
  });

  initSentry();
  initMiddlewares(app);
  initContext(app);
  initLogger(app);
  initPrefix(app);
  initPipes(app);
  initSwagger(app);

  const configService = app.get<ConfigService>(ConfigService);
  app.use(json({ limit: configService.get<string>('BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get<string>('URL_LIMIT') }));

  await initListening(app);
}

bootstrap();
