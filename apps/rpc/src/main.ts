import { json, urlencoded } from 'express';
import * as fs from 'fs';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import {
  initContext,
  initListening,
  initLogger,
  initPipes,
  initPrefix,
  initSentry,
  initSwagger,
} from '@app/common/bootstrap';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createLogger(logFileDir);

const ssl = process.env.SSL === 'true';
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

  initSentry();
  initContext(app);
  initLogger(app);
  initSwagger(app);
  initPipes(app);
  initPrefix(app);

  const configService = app.get<ConfigService>(ConfigService);
  app.use(json({ limit: configService.get<string>('BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get<string>('URL_LIMIT') }));

  await initListening(app);
}

bootstrap();
