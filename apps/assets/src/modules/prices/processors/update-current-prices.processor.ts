import { Job, Queue } from 'bull';

import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../../common/enum/job-name.enum';
import { JobCompleteStates } from '../../../common/enum/job-states.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceSourceRepository } from '../repositories/price-source.repository';
import { PriceSource } from '../types/price-source.type';

@Processor(QueueName.ASSETS)
export class UpdateCurrentPricesProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectQueue(QueueName.ASSETS) private assetsQueue: Queue,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
  ) {}

  @Process(JobName.UPDATE_CURRENT_PRICES)
  async handle(job: Job) {
    try {
      const priceSources = await this.priceSourceRepository.find({
        where: { enabled: true },
      });
      this.logger.debug(`Loading prices from ${priceSources.length} source(s)`);

      for (const source of priceSources) {
        await this.assetsQueue.add(JobName.UPDATE_CURRENT_PRICES_FROM_SOURCE, {
          sourceId: source.id,
          strategy: source.type,
          name: source.name,
          config: source.config,
        } as PriceSource);
      }

      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (e) {
      this.logger.error(`Error processing prices job: ${job.name}. Error: ${e.toString()}`);
      await job.moveToFailed({ message: e.toString() });
    }
  }
}
