import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { PriceJobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceService } from '../price.service';

@Processor(QueueName.PRICES)
export class AssetsHistoricalPricesProcessor {
  constructor(
    private readonly priceService: PriceService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  @Process(PriceJobName.UPDATE_HISTORICAL_PRICES)
  async handlePriceJob(job: Job) {
    try {
      this.logger.debug(`Create Historical Prices Job job.id: ${job.id}`);
      await this.createHistoricalPrices();
    } catch (error) {
      this.logger.error(`Error to process price job.id: ${job.id}`, error);
      throw error;
    }
  }

  private async createHistoricalPrices() {
    await this.priceService.saveHistoricalPricesFromCurrentOnes();
  }
}
