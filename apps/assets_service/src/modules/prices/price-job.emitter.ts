import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobName } from '../../common/enum/job-name.enum';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { PriceSourceEntity } from './entities/price-source.entity';
import { PriceSourceRepository } from './repositories/price-source.repository';

@Injectable()
export class PriceJobEmitter {
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetsRepository: AssetsRepository,
    private configService: ConfigService,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
    @InjectQueue('assets') private assetsQueue: Queue,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public emitJob(job: JobName) {
    switch (job) {
      case JobName.PRICES:
        return this.broadcastAssetsPriceJobs();
      case JobName.CLEAR_PRICES:
        return this.broadcastClearDatabaseOnCurrentPricesJob();
      default:
        this.logger.error(`Unknow job ${job}`);
    }
  }

  // CLEAR DATABASE ON CURRENT PRICES
  private broadcastClearDatabaseOnCurrentPricesJob() {
    this.logger.debug('Broadcast clear database on current prices');
    const priceJobData = { clearDBOnCurrentPrices: true, config: {} };
    this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
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
    priceSources.forEach(async (priceSource: PriceSourceEntity) => {
      const { config, id: sourceId, name: sourceName, type: strategy } = priceSource;
      this.logger.debug(
        `Try to broadcast current price jobs on price source ${sourceName}, id: ${sourceId}`,
      );
      const priceJobData = {
        config,
        sourceId,
        strategy,
      };
      this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
    });
  }
}
