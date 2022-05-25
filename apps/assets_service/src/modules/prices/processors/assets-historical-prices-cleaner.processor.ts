import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';

import { AssetsHistoricalPriceRepository } from '../repositories/asset-historical-price.repository';
import { QueueName } from 'apps/assets_service/src/common/enum/queue-name.enum';
import { JobName } from 'apps/assets_service/src/common/enum/job-name.enum';

@Processor(QueueName.ASSETS)
export class AssetsHistoricalPricesCleanerProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
  ) {}

  @Process(JobName.CLEAR_PRICES)
  async handlePriceJob(job: Job) {
    try {
      this.logger.log(`Process Clear Historical Price job.id: ${job.id}`);
      await this.clearDBOnCurrentPrices();
      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (error) {
      this.logger.error(`Error to process historical price job.id: ${job.id}`);
      this.logger.error(error);
      await job.moveToFailed({ message: error.toString() });
    }
  }

  public async clearDBOnCurrentPrices(): Promise<void> {
    await this.assetsHistoricalPriceRepository.clearPrices();
  }
}
