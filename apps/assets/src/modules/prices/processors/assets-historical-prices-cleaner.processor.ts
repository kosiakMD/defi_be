import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { PriceJobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { AssetsHistoricalPriceRepository } from '../repositories/asset-historical-price.repository';

/*
 Cleanups not needed historical prices from database.
 Should be executed every few hours.
* */
@Processor(QueueName.PRICES)
export class AssetsHistoricalPricesCleanerProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
  ) {}

  @Process(PriceJobName.CLEAR_HISTORICAL_PRICES)
  async handlePriceJob(job: Job) {
    try {
      this.logger.log(`Process Clear Historical Price job.id: ${job.id}`);
      await this.clearPrices();
    } catch (error) {
      this.logger.error(`Error to process historical price job.id: ${job.id}`, error);
      throw error;
    }
  }

  public async clearPrices(): Promise<void> {
    await this.assetsHistoricalPriceRepository.clearPrices();
  }
}
