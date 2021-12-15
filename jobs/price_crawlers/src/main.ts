import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { addTimeLogFeature } from '@app/common/Logger/Logger.service';
import { createJobLogger } from '@app/common/Logger/winston';

import { AppModule } from './app.module';
import { logFileDir } from './config';

const logger = createJobLogger(logFileDir);

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    logger: logger,
    bodyParser: false,
  });
  app.useLogger(logger);

  const enhancedLogger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useLogger(enhancedLogger);

  await app.listen(process.env.SERVICE_PORT || 3000);
}

bootstrap();
