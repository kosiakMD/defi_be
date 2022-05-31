import { config } from 'aws-sdk';

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
import { AwsConfigService } from './config/aws/aws.config.service';

const logger = createLogger(logFileDir);

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
  initPrefix(app);
  initPipes(app);
  initSwagger(app);

  const awsConfigService = app.get(AwsConfigService);

  config.update({
    accessKeyId: awsConfigService.awsKeyId,
    secretAccessKey: awsConfigService.awsSecretAccessKey,
    region: awsConfigService.region,
  });

  await initListening(app);
}

bootstrap().catch((e) => {
  logger.error(e, undefined, 'Bootstrap');
  throw e;
});
