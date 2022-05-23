import { Job } from 'bull';
import { Store } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { Process, Processor } from '@nestjs/bull';
import { CACHE_MANAGER, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { JobCompleteStates } from '../../../common/enum/job-states.enum';

import { AssetsRepository } from '../../assets/repositories/assets.repository';
import { AssetHistoricalPriceEntity } from '../entities/asset-historical-price.entity';
import { AssetPriceEntity } from '../entities/asset-price.entity';
import { AssetsHistoricalPriceRepository } from '../repositories/asset-historical-price.repository';
import { getPriceStrategyType } from '../strategies';
import { BaseStrategy } from '../strategies/base.strategy';
import { AssetPrice } from '../types/asset-price.type';
import { PriceSource } from '../types/price-source.type';
import { getAssetAveragePricesCacheKey, getAssetPriceCacheKey } from '../utils/price-cache.utils';

@Processor('assets')
export class AssetsCurrentPricesProcessor {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Store,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
  ) {}

  @Process('prices')
  async handlePriceJob(job: Job) {
    try {
      const {
        config: { chainId },
        strategy,
      } = job.data;
      this.logger.debug(
        `Processing price job for assets on chainId: ${chainId}, strategy: ${strategy}`,
      );
      await this.processingJob(job.data);
      return JobCompleteStates.SUCCESS;
    } catch (error) {
      this.logger.error(`Error to process price job.id: ${job.id}`);
      this.logger.error(error);
      return JobCompleteStates.FAILURE;
    }
  }

  public async clearDBOnCurrentPrices(): Promise<void> {
    await this.assetsHistoricalPriceRepository.clearPrices();
  }

  public async createHistoricalPrices(): Promise<void> {
    // TODO: implement database time granularity cleaning
    try {
      const assets = await this.assetsRepository.getAllTrackedAssets();
      for (const asset of assets) {
        const { address, chainId } = asset;
        const cachedAssetAveragePricesKey = getAssetAveragePricesCacheKey({ address, chainId });
        const cachedAssetAveragePrices: AssetPriceEntity[] =
          (await this.cacheManager.get(cachedAssetAveragePricesKey)) //
            ?.filter(Boolean)
            .map((price) => {
              price.timestamp = new Date(price.timestamp);
              return plainToClass(AssetHistoricalPriceEntity, price);
            }) || [];
        if (cachedAssetAveragePrices?.length) {
          // Get start time to prcess and save prices every 15 mins
          const m15 = 15 * 60 * 1000;
          let startTime = this.getPricesM15StartTime(cachedAssetAveragePrices[0].timestamp);
          let newPrice: AssetPriceEntity;
          const assetPrices = [];
          while (
            startTime <
            cachedAssetAveragePrices[cachedAssetAveragePrices.length - 1].timestamp.getTime() + m15
          ) {
            newPrice = this.getNearestArrayItemByTimestamp(
              startTime,
              cachedAssetAveragePrices,
              m15,
            );
            if (newPrice) {
              newPrice.timestamp = new Date(startTime);
              newPrice.asset = asset;
              assetPrices.push(newPrice);
            }
            startTime += m15;
            newPrice = null;
          }
          await this.assetsHistoricalPriceRepository.upsert(assetPrices, ['asset', 'timestamp']);
        }
      }
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  private getNearestArrayItemByTimestamp(
    timestamp: number,
    prices: AssetPriceEntity[],
    range: number,
  ): AssetPriceEntity {
    const earlierPrice = prices
      .filter((price) => {
        const priceTimestamp = price.timestamp.getTime();
        return priceTimestamp <= timestamp && priceTimestamp > timestamp - range;
      })
      .pop();

    const olderPrice = prices
      .filter((price) => {
        const priceTimestamp = price.timestamp.getTime();
        return priceTimestamp <= timestamp + range && priceTimestamp > timestamp;
      })
      .shift();

    if (earlierPrice && olderPrice) {
      return timestamp - earlierPrice.timestamp.getTime() <
        olderPrice.timestamp.getTime() - timestamp
        ? earlierPrice
        : olderPrice;
    }

    return earlierPrice ? earlierPrice : olderPrice;
  }

  private getPricesM15StartTime(timestamp: Date): number {
    let minutes = timestamp.getMinutes();
    minutes = minutes >= 45 ? 45 : minutes >= 30 ? 30 : minutes >= 15 ? 15 : 0;
    return new Date(timestamp).setMinutes(minutes, 0, 0);
  }

  private async updateAssetPrice(assetPrice: AssetPrice): Promise<void> {
    try {
      const cacheKey = getAssetPriceCacheKey(assetPrice);
      const { price, sourceId } = assetPrice;
      await this.cacheManager.set(cacheKey, { price, sourceId }, 30 * 60); // 30 min to process cached prices
    } catch (error) {
      this.logger.error(
        `Error to set asset price ${JSON.stringify(assetPrice)} to cache, ${JSON.stringify(error)}`,
      );
    }
  }

  private async processingJob(jobData: PriceSource): Promise<void> {
    const { strategy } = jobData;
    const priceStrategyType = getPriceStrategyType(strategy);
    const priceStrategy = await this.moduleRef.resolve<BaseStrategy>(priceStrategyType);
    const assetsPrices = await priceStrategy.fetchPrices(jobData);
    const promises = assetsPrices.map(this.updateAssetPrice.bind(this));
    await Promise.all(promises);
  }
}
