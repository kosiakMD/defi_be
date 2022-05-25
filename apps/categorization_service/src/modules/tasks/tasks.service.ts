import { JobStatusClean, Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, REGULAR_TASK } from '../../common/constants';
import { IJobPayload } from '../../common/dto/job/job.payload.interface';
import { ExternalCommand } from '../../common/enum/service.enum';

@Injectable()
export class TasksService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectQueue(REDIS_TASK_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8PM) //uncomment to enable daily running
  async cronTask() {
    const task = { command: ExternalCommand.start_fetching };
    this.logger.log(`cronTask: ${task.command}`);
    await this.queueTask(task);
  }

  async queueTask(data: IJobPayload): Promise<void> {
    try {
      await this.queue.add(REGULAR_TASK, data, { removeOnComplete: true });
    } catch (error) {
      this.logger.error(`Error queueing task ${data.command}`);
      throw error;
    }
  }

  async getJobsStats() {
    return {
      active: await this.getActiveJobs(),
      waiting: await this.getJobsInQueue(),
      failed: await this.getFailedJobs(),
    };
  }

  async cleanQueue(grace: number, status?: JobStatusClean, limit?: number) {
    return this.queue.clean(grace, status, limit);
  }

  private async getActiveJobs() {
    return this.queue.getJobs(['active']);
  }

  private async getJobsInQueue() {
    return this.queue.getJobs(['waiting']);
  }

  private async getFailedJobs() {
    // get 4 latest failed jobs
    return this.queue.getJobs(['failed'], -4);
  }
}
