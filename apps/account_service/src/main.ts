import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { createLogger } from '@app/common/Logger/winston';
import {
  initListening,
  initLogger,
  initPipes,
  initPrefix,
  initSentry,
  initSwagger,
} from '@app/common/bootstrap';
import { withContext } from '@app/common/middlewares/withContext';

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

  app.use(withContext);

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
