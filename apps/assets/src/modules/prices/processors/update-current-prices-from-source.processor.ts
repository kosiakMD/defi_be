import { Job } from 'bull';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { PriceService } from '../price.service';
import { getPriceStrategyType } from '../strategies';
import { BaseStrategy } from '../strategies/base.strategy';
import { PriceSource } from '../types/price-source.type';

@Processor(QueueName.ASSETS)
export class UpdateCurrentPricesFromSourceProcessor {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly priceService: PriceService,
  ) {}

  @Process(JobName.UPDATE_CURRENT_PRICES_FROM_SOURCE)
  async handle(job: Job<PriceSource>) {
    try {
      await this.process(job.data);
    } catch (e) {
      this.logger.error(
        `Error processing price job: ${job.name} for source ${
          job.data?.sourceId
        }. Error: ${e.toString()}`,
      );
      throw e;
    }
  }

  private async process(jobData: PriceSource): Promise<void> {
    const { sourceId, name, strategy } = jobData;
    this.logger.debug(`Loading prices from source ${sourceId}, name ${name}`);

    const priceStrategyType = getPriceStrategyType(strategy);
    const priceStrategy = await this.moduleRef.resolve<BaseStrategy>(priceStrategyType);
    const assetsPrices = await priceStrategy.fetchPrices(jobData);
    this.logger.debug(`Loaded ${assetsPrices.length} prices from source ${sourceId}, name ${name}`);

    await this.priceService.saveAssetPrices(assetsPrices);
  }
}
