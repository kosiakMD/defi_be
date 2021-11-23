import { NestFactory } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { queueOptions } from './config/queues/asset.migration.queue';
import { addTimeLogFeature } from './logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    ...queueOptions.migrationQueueOptions,
  });
  const logger = addTimeLogFeature(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useLogger(logger);

  await app.listen();

  logger.log('microservice consumer started', process.env.ASSET_MIGRATION_QUEUE);
}

bootstrap();
