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
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    bodyParser: true,
    abortOnError: false,
    logger,
  });

  initSentry();
  initLogger(app);
  initPrefix(app);
  initSwagger(app);
  initPipes(app);

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
});
