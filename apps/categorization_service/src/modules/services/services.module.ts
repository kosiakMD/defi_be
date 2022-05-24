import { Module } from '@nestjs/common';

import { TasksAbortChecker } from './tasks.abort.checker';

@Module({
  providers: [TasksAbortChecker],
  exports: [TasksAbortChecker],
})
export class ServicesModule {}
