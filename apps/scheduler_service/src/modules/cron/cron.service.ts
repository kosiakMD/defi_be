import { CronJob } from 'cron';

import { Inject, Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { TaskInterface } from '../../common/interfaces/task.interfaces';

@Injectable()
export class CronService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  private getTaskJobName(task: TaskInterface): string {
    return `scheduled_task_${task.id}`;
  }

  public start(task: TaskInterface, onStart: () => void, onComplete?: () => void) {
    const job = new CronJob(task.cron, onStart, onComplete);

    this.schedulerRegistry.addCronJob(this.getTaskJobName(task), job);
    job.start();
    this.logger.log(`Created Cron ${task.id} (${task.method} - ${task.endpoint}) (${task.cron})`);
    return job;
  }

  public stop(task: TaskInterface) {
    if (!this.exists(task)) {
      return;
    }

    this.schedulerRegistry.deleteCronJob(this.getTaskJobName(task));
    this.logger.log(`Deleted Cron ${task.id} (${task.method} - ${task.endpoint})`);
  }

  public exists(task: TaskInterface) {
    return this.schedulerRegistry.doesExist('cron', this.getTaskJobName(task));
  }
}
