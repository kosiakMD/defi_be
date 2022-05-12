import { Queue } from 'bull';
import { v4 as uuid } from 'uuid';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { PriceSourceMetadata } from './dto/PriceSourceMetadata.dto';
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
  @Cron(`0 */1 * * * *`)
  async handleUpdateFromDatabaseCron() {
    this.logger.debug(`Broadcast assets price jobs every 7 minutes`);
    await this.broadcastAssetsPriceJobs();
  }

  // HISTORICAL PRICES
  @Cron(`0 */15 * * * *`)
  handeHistoricalPricesCron() {
    this.logger.debug(`Broadcast historical prices job every 15 minutes`);
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
    const processingUUID = uuid();
    priceSources.forEach(async (priceSource: PriceSourceEntity) => {
      const { config, id: sourceId, name, type: strategy } = priceSource;
      const metadata = priceSource.metadata || new PriceSourceMetadata();
      this.logger.debug(`Try to process price source id: ${sourceId}`);
      const currentPriceJobInterval = config.currentPriceJobInterval * 1000; // config value in sec
      if (Date.now() - metadata.lastOperation > currentPriceJobInterval) {
        metadata.executionInstanceMarker = processingUUID;
        await this.priceSourceRepository.update(sourceId, { metadata });
        const processingPriceSource = await this.priceSourceRepository.findOne({
          id: priceSource.id,
        });
        if ((processingPriceSource.metadata.executionInstanceMarker = processingUUID)) {
          this.logger.debug(`Assets price job for ${name}`);
          const priceJobData = {
            config,
            sourceId,
            strategy,
          };
          this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
          metadata.lastOperation = Date.now();
          await this.priceSourceRepository.update(sourceId, { metadata });
        }
      } else {
        this.logger //
          .debug(
            `Last price source id: ${sourceId} operation(${metadata.lastOperation}) in distance less than ${currentPriceJobInterval}`,
          );
      }
    });
  }
}
