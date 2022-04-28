import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { JobsModule } from './jobs/jobs.module';
import { JobsRunner } from './jobs/jobs.runner';
import { JobsV3Runner } from './jobs/jobs.v3.runner';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const jobsRunner = app.select(JobsModule).get(JobsRunner);
  await jobsRunner.initialize();

  const jobsV3Runner = app.select(JobsModule).get(JobsV3Runner);

  await Promise.all([jobsRunner.update(), jobsV3Runner.update()]);

  await app.close();
}
bootstrap();
