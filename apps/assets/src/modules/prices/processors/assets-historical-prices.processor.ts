import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { AssetsHistoricalPriceRepository } from '../repositories/asset-historical-price.repository';
import { HistoricalPriceJobData } from '../types/historical-price-job-data.type';

@Processor(QueueName.ASSETS)
export class AssetsHistoricalPricesProcessor {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
  ) {}

  @Process('historicalPrices')
  async handlePriceJob(job: Job) {
    try {
      await this.processingJob(job.data);
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to process historical price job.id: ${job.id}`);
      this.logger.error(error);
      return JobCompleteStates.FAILURE;
    }
  }

  private async processingJob(jobData: HistoricalPriceJobData): Promise<void> {
    // TODO: Not implemented
    this.logger.log(`Running historical price processing: ${jobData.assetId}`);
  }
}
