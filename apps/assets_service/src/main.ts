import { config } from 'aws-sdk';

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
  initLogger(app);
  initPrefix(app);
  initSwagger(app);
  initPipes(app);

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
});
