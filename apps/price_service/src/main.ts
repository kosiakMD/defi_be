import { json, urlencoded } from 'express';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import { initSentry } from '@app/common/bootstrap';
import initListening from '@app/common/bootstrap/initListening';
import { initLogger } from '@app/common/bootstrap/initLogger';
import initPipes from '@app/common/bootstrap/initPipes';
import initPrefix from '@app/common/bootstrap/initPrefix';
import initSwagger from '@app/common/bootstrap/initSwagger';

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
  initLogger(app);
  initPrefix(app);
  initSwagger(app);
  initPipes(app);

  const configService = app.get<ConfigService>(ConfigService);
  app.use(json({ limit: configService.get<string>('BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get<string>('URL_LIMIT') }));

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
});
