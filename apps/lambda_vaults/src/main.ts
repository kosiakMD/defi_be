import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { JobsModule } from './jobs/jobs.module';
import { JobsRunner } from './jobs/jobs.runner';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const jobsRunner = app.select(JobsModule).get(JobsRunner);
  await jobsRunner.initialize();
  await jobsRunner.update();

  await app.close();
}
bootstrap();
