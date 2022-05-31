import { json, urlencoded } from 'express';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import {
  initContext,
  initListening,
  initLogger,
  initPipes,
  initPrefix,
  initSentry,
  initSwagger,
} from '@app/common/bootstrap';
import { createLogger } from '@app/common/logger/winston';

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
  initContext(app);
  initLogger(app);
  initSwagger(app);
  initPrefix(app);
  initPipes(app);

  const configService = app.get<ConfigService>(ConfigService);
  app.use(json({ limit: configService.get<string>('BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get<string>('URL_LIMIT') }));

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
  throw e;
});
