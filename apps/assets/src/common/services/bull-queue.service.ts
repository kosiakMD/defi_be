import { Job, Queue } from 'bull';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class BullQueueService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService) {}

  public cleanAllFailedJobs(queue: Queue): void {
    queue
      .clean(0, 'failed')
      .then((jobs: Job[]) => {
        if (jobs.length) {
          this.logger.log(`removed failed jobs: [${jobs}]`);
        }
      })
      .catch((err: Error) => {
        this.logger.error(`pricesQueue.clean error: [${err.message}]`);
      });
  }

  public setupStalledJobRemovingHandler(queue: Queue): void {
    queue.on('failed', async (job: Job, error: Error) => {
      if (error.message === 'job stalled more than allowable limit') {
        this.logger.warn(`[${job.id}] job stalled, it will be removed`);
        await queue.removeJobs(job.id.toString());
      }
    });
  }
}
