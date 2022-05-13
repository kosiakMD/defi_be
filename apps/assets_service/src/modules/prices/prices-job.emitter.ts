import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
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
  @Cron(`0 */1 * * * *`)
  handeHistoricalPricesCron() {
    this.logger.debug(`Broadcast historical prices job every 15 minutes`);
    this.broadcastHistoricalPricesJobs();
  }

  // CLEAR DATABASE ON CURRENT PRICES
  @Cron('0 10 * * *')
  handeClearDatabaseOnCurrentPricesCron() {
    this.logger.debug('Clear database on current prices every day at 10AM');
    const priceJobData = { clearDBOnCurrentPrices: true, config: {} };
    this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
  }

  private async broadcastHistoricalPricesJobs(): Promise<void> {
    const priceSource = (await this.priceSourceRepository.find({ enabled: true })) //
      .find(({ config }) => config?.keepHistoricalPricesJobLastExecutionTime);
    if (!priceSource) {
      this.logger.error('No price source to keepHistoricalPricesJobLastExecutionTime!');
      return;
    }
    await this.priceSourceRepository.manager.connection.transaction(async (manager) => {
      const processingPriceSource = await manager.findOne(
        PriceSourceEntity,
        {
          id: priceSource.id,
        },
        { lock: { mode: 'pessimistic_write' } },
      );
      this.logger.debug(
        `Try to pocessing Price Source ${processingPriceSource.name} for historical prices job`,
      );
      const metadata = processingPriceSource?.metadata || new PriceSourceMetadata();
      const historicalPriceJobInterval =
        (processingPriceSource?.config?.historicalPriceJobInterval ||
          this.configService.get('ASSETS_HISTORICAL_PRICE_JOB_INTERVAL')) * 1000; // 15 min default historical prices processing interval
      if (
        Date.now() - (metadata?.lastExecutionHistoricalPricesJob || 0) >
        historicalPriceJobInterval
      ) {
        /**
         * - get all assets by pages
         * - broadcast historical price job for every asset
         */
        const countOptions = { where: { disabled: false } };
        const assetsNumber = await this.assetsRepository.count(countOptions);
        const take = this.configService.get<number>('ASSETS_TAKE_SIZE');
        let skip = 0;
        while (skip < assetsNumber) {
          this.logger.debug(
            `Broadcast historical prices jobs for assets, take ${take} skip ${skip}`,
          );
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
        metadata.lastExecutionHistoricalPricesJob = Date.now();
        await manager.update(PriceSourceEntity, processingPriceSource.id, { metadata });
      } else {
        this.logger //
          .debug(
            `Last price source id: ${processingPriceSource.id} historical prices operation(${metadata.lastExecutionHistoricalPricesJob}) in distance less than ${historicalPriceJobInterval}`,
          );
      }
    });
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
      this.logger.debug(`PRICE_SOURCE ${priceSource.name}`);
      await this.priceSourceRepository.manager.connection.transaction(async (manager) => {
        const processingPriceSource = await manager.findOne(
          PriceSourceEntity,
          {
            id: priceSource.id,
          },
          { lock: { mode: 'pessimistic_write' } },
        );
        const { config, id: sourceId, name, type: strategy } = processingPriceSource;
        const metadata = processingPriceSource.metadata || new PriceSourceMetadata();
        this.logger.debug(`Try to process price source id: ${sourceId}`);
        const currentPriceJobInterval =
          (config?.currentPriceJobInterval ||
            this.configService.get('ASSETS_CURRENT_PRICE_JOB_INTERVAL')) * 1000; // config value in sec
        if (Date.now() - metadata.lastOperation > currentPriceJobInterval) {
          this.logger.debug(`Assets price job for ${name}`);
          const priceJobData = {
            config,
            sourceId,
            strategy,
          };
          this.assetsQueue.add(this.configService.get('ASSETS_PRICE_JOB_TYPE'), priceJobData);
          metadata.lastOperation = Date.now();
          await manager.update(PriceSourceEntity, sourceId, { metadata });
        } else {
          this.logger //
            .debug(
              `Last price source id: ${sourceId} operation(${metadata.lastOperation}) in distance less than ${currentPriceJobInterval}`,
            );
        }
      });
    });
  }
}
