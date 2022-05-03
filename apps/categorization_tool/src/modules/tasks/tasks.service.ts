import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, COMMON_TASK } from '../../common/constants';
import { CommandUnparameterized } from '../../common/enum/service.enum';

@Injectable()
export class TasksService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectQueue(REDIS_TASK_QUEUE) private readonly queue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8PM)
  async cronTask() {
    const task = { command: CommandUnparameterized.start_fetching };
    this.logger.log(`cronTask: ${task.command}`);
    await this.queueTask(task);
  }

  public async queueTask(data): Promise<void> {
    try {
      await this.queue.add(COMMON_TASK, data);
    } catch (error) {
      this.logger.error(`Error queueing task ${data.command}`);
      throw error;
    }
  }
}
