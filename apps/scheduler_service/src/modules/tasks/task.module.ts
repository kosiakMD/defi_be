import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CronModule } from '../cron/cron.module';
import { TaskRepository } from './repositories/task.repository';
import { TaskService } from './task.service';

@Module({
  imports: [HttpModule, CronModule, TypeOrmModule.forFeature([TaskRepository])],
  providers: [TaskService, TaskRepository],
  exports: [TaskService],
})
export class TaskModule {}
