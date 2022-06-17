import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { formatError } from '@app/common/utils';

import { PriceJobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';
import { BullQueueService } from '../../../common/services/bull-queue.service';

import { PriceSourceRepository } from '../repositories/price-source.repository';
import { PriceSource } from '../types/price-source.type';

/*
 Refreshes tracked assets prices from defined strategies.
 Should be executed on minutes basis.
* */
@Processor(QueueName.PRICES)
export class UpdateCurrentPricesProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectQueue(QueueName.PRICES) private pricesQueue: Queue,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    private readonly bullQueueService: BullQueueService,
  ) {
    //https://defiyield.atlassian.net/browse/ID-4678
    // We use bull queue for the price jobs processing.
    // We generate jobId by ourselves to replace existing job(s) in the queue if any.
    // At some point of time some jobs may get stalled and as a result such jobs
    // will never be re-processed. 'stalled' EventListener removes such jobs,
    // but there is still a possibility that process is killed before stalled job is removed.
    // So we clean failed jobs once on start-up to guarantee correct processing
    bullQueueService.cleanAllFailedJobs(pricesQueue);
    bullQueueService.setupStalledJobRemovingHandler(pricesQueue);
  }

  @Process(PriceJobName.UPDATE_CURRENT_PRICES)
  async handle(job: Job) {
    try {
      const priceSources = await this.priceSourceRepository.find({
        where: { enabled: true },
      });
      this.logger.debug(`Loading prices from ${priceSources.length} source(s)`);

      for (const source of priceSources) {
        await this.pricesQueue.add(
          PriceJobName.UPDATE_CURRENT_PRICES_FROM_SOURCE,
          {
            sourceId: source.id,
            strategy: source.type,
            name: source.name,
            config: source.config,
          } as PriceSource,
          {
            // NOTE: This should prevent update price jobs duplications
            jobId: `updated-current-price:${source.id}`,
          },
        );
      }
    } catch (e) {
      this.logger.error({
        message: `Error processing prices job: ${job.name}`,
        error: formatError(e),
      });
      throw e;
    }
  }
}
