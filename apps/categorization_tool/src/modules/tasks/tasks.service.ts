import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, COMMON_TASK } from '../../common/constants';

@Injectable()
export class TasksService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectQueue(REDIS_TASK_QUEUE) private readonly queue: Queue,
  ) {}

  public async queueTask(data): Promise<void> {
    try {
      await this.queue.add(COMMON_TASK, data);
    } catch (error) {
      this.logger.error(`Error queueing task ${data.command}`);
      throw error;
    }
  }
}
