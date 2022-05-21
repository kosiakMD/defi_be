import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';

import { JobName } from '../../common/enum/job-name.enum';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { PriceService } from './price.service';
import { AssetsCurrentPricesProcessor } from './processors/assets-current-prices.processor';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Injectable()
export class PriceJobEmitter {
  constructor(
    private readonly assetsCurrentPricesProcessor: AssetsCurrentPricesProcessor,
    @InjectRepository(AssetsRepository)
    private readonly assetsRepository: AssetsRepository,
    private configService: ConfigService,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    @InjectQueue('assets') private assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private priceService: PriceService,
  ) {}

  public emitJob(job: JobName) {
    switch (job) {
      case JobName.CLEAR_PRICES:
        return this.assetsCurrentPricesProcessor.clearDBOnCurrentPrices();
      case JobName.HISTORICAL_PRICES:
        return this.assetsCurrentPricesProcessor.createHistoricalPrices();
      case JobName.PRICES:
        return this.broadcastAssetsPriceJobs();
      default:
        this.logger.error(`Unknow job ${job}`);
    }
  }

  // CURRENT PRICES
  private async broadcastAssetsPriceJobs(): Promise<void> {
    this.logger.debug(`Broadcast assets current price jobs`);
    const priceSources = await this.priceSourceRepository.find({
      where: { enabled: true },
    });
    /**
     * for each price source:
     * - add price jobs including strategy config and sourseId to be able to process it on job consumer
     */
    for (const priceSource of priceSources) {
      const { config, id: sourceId, name: sourceName, type: strategy } = priceSource;
      this.logger.debug(
        `Try to broadcast current price jobs on price source ${sourceName}, id: ${sourceId}`,
      );
      const priceJobData = {
        config,
        sourceId,
        strategy,
      };
      await new Promise<void>((ok) => {
        this.assetsQueue
          .add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData)
          .then((job) => {
            // In 10 mins resolve Promise to finish price source processing for 100%
            const timeout = setTimeout(() => {
              const message = `Price source ${sourceName} pricesing finished by timeout!`;
              this.logger.error(message);
              ok();
              job.moveToFailed({ message }, true);
            }, 10 * 60 * 1000);

            const checkIfJobFinished = async () => {
              const res = await job.finished();
              if (res) {
                this.logger.debug(`Price source ${sourceName} pricessing finished`);
                clearTimeout(timeout);
                ok();
              } else {
                await delay(10);
                await checkIfJobFinished();
              }
            };
            checkIfJobFinished();
          });
      });
    }
    this.logger.debug(`Finished to process current price jobs`);

    await this.priceService.calculateAvaragePrices();
  }
}
