import { Module } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { CronService } from './cron.service';

@Module({
  imports: [],
  providers: [CronService, SchedulerRegistry],
  exports: [CronService],
})
export class CronModule {}
