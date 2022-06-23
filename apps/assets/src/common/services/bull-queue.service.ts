import { Queue } from 'bull';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

@Injectable()
export class BullQueueService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  public async cleanAllFailedJobs(queue: Queue): Promise<void> {
    try {
      const removedJobs = await queue.clean(0, 'failed');
      if (removedJobs.length) {
        this.logger.log(`removed failed jobs: [${removedJobs}]`);
      }
    } catch (err) {
      this.logger.error(`pricesQueue.clean error: [${err.message}]`);
    }
  }
}
