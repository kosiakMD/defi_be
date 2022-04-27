import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { PriceSourceEntity } from './entities/price-sources.entity';
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

  // CURRENT PRICES
  // because of Coingecko API rate limits
  @Cron('0 */7 * * * *')
  async handleUpdateFromDatabaseCron() {
    this.logger.debug('Broadcast assets price jobs every 5 minutes');
    await this.broadcastAssetsPriceJobs();
  }

  // HISTORICAL PRICES
  @Cron('0 */15 * * * *')
  handeHistoricalPricesCron() {
    this.logger.debug('Broadcast historical prices job every 15 minutes');
    this.broadcastHistoricalPricesJobs();
  }

  // CLEAR DATABASE ON CURRENT PRICES
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  handeClearDatabaseOnCurrentPricesCron() {
    this.logger.debug('Clear database on current prices every day at 10AM');
    const priceJobData = { clearDBOnCurrentPrices: true, config: {} };
    this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
  }

  private async broadcastHistoricalPricesJobs(): Promise<void> {
    /**
     * - get all assets by pages
     * - broadcast historical price job for every asset
     */
    const countOptions = { where: { disabled: false } };
    const assetsNumber = await this.assetsRepository.count(countOptions);
    const take = this.configService.get<number>('ASSETS_TAKE_SIZE');
    let skip = 0;
    while (skip < assetsNumber) {
      this.logger.debug(`Broadcast historical prices jobs for assets, take ${take} skip ${skip}`);
      const assets = await this.assetsRepository //
        .find({ ...countOptions, ...{ take: Math.min(take, assetsNumber - skip), skip } });
      assets.forEach((asset) => {
        const historicalPricesJobData = {
          assetId: asset.id,
        };
        this.assetsQueue.add(
          this.configService.get('ASSETS_HISTORICAL_PRICE_JOB_TYPE'),
          historicalPricesJobData,
        );
      });
      skip += take;
    }
  }

  private async broadcastAssetsPriceJobs(): Promise<void> {
    const priceSources = await this.priceSourceRepository.find({
      where: { enabled: true },
    });
    /**
     * for each price source:
     * - add price jobs including strategy config and sourseId to be able to process it on job consumer
     */
    priceSources.forEach(async (priceSource: PriceSourceEntity) => {
      const { config, id: sourceId, name, type: strategy } = priceSource;
      this.logger.debug(`Assets price job for ${name}`);

      const priceJobData = {
        config,
        sourceId,
        strategy,
      };
      this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
    });
  }
}
