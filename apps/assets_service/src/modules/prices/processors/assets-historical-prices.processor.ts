import { JobName } from 'apps/assets_service/src/common/enum/job-name.enum';
import { QueueName } from 'apps/assets_service/src/common/enum/queue-name.enum';
import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';

import { PriceService } from '../price.service';

@Processor(QueueName.ASSETS)
export class AssetsHistoricalPricesProcessor {
  constructor(
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Process(JobName.HISTORICAL_PRICES)
  async handlePriceJob(job: Job) {
    try {
      this.logger.debug(`Create Historical Prices Job job.id: ${job.id}`);
      await this.createHistoricalPrices();
      await job.moveToCompleted(JobCompleteStates.SUCCESS);
    } catch (error) {
      this.logger.error(`Error to process price job.id: ${job.id}, ${error.message}`);
      await job.moveToFailed({ message: error.toString() });
    }
  }

  private async createHistoricalPrices() {
    await this.priceService.saveAssetsHistoricalPrices();
  }
}
