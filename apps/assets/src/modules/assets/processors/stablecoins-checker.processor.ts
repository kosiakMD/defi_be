/* eslint-disable camelcase */
import { Job } from 'bull';
import { CoinGeckoClient } from 'coingecko-api-v3';

import { Process, Processor } from '@nestjs/bull';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CoingeckoPlatformEnum } from '@app/common';

import { AssetJobName } from '../../../common/enum/job-name.enum';
import { QueueName } from '../../../common/enum/queue-name.enum';

import { AssetCategoryEntity } from '../../assets-category/entities/asset-category.entity';
import { AssetsCategoryRepository } from '../../assets-category/repositories/assets-category.repository';
import { AssetEntity } from '../entities/asset.entity';
import { AssetCategory } from '../enums/asset-category.enum';
import { AssetsCachedRepository } from '../repositories/assets.cached-repository';

type PricesData = {
  [key: string]: number;
};

type MarketCapData = {
  [key: string]: number;
};

@Processor(QueueName.ASSETS)
export class StablecoinsCheckerProcessor {
  private readonly marketCapCurrency = 'usd';
  private readonly marketCapThreshold = 5000000;
  private readonly priceCurrencies = ['usd', 'eur', 'jpy'];
  private readonly priceDeviation = 0.05;

  private readonly coinGeckoClient = new CoinGeckoClient({
    timeout: 10000,
    autoRetry: true,
  });

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly assetsRepository: AssetsCachedRepository,
    @InjectRepository(AssetsCategoryRepository)
    private readonly assetsCategoryRepository: AssetsCategoryRepository,
  ) {}

  @Process(AssetJobName.VERIFY_STABLECOINS)
  public async verifyStablecoins(job: Job) {
    try {
      this.logger.debug('Stablecoins verification started');
      const [assets, [unverifiedStablecoinCategory]] = await Promise.all([
        this.assetsRepository.findByCategoryCodeWithoutCategories(AssetCategory.Stablecoin),
        this.assetsCategoryRepository.findOrCreate([AssetCategory.UnverifiedStablecoin]),
      ]);
      for (const asset of assets) {
        await this.verifyAssetIsStablecoin(asset, unverifiedStablecoinCategory);
      }
      this.logger.debug('Stablecoins verification finished');
    } catch (e) {
      this.logger.error(`Error to process job [${job.id}]: ${e.message}, ${e.stack}`, { job });
      throw e;
    }
  }

  private async verifyAssetIsStablecoin(asset: AssetEntity, category: AssetCategoryEntity) {
    const coingeckoChainId = CoingeckoPlatformEnum[ChainIdEnum[asset.chainId]];
    const coingeckoAsset = await this.coinGeckoClient.contract({
      id: coingeckoChainId as any,
      contract_address: asset.address,
    });

    if (!coingeckoAsset || !coingeckoAsset.id) {
      return;
    }

    const {
      name,
      categories,
      market_data: { current_price, market_cap },
    } = coingeckoAsset;

    const verified = this.isStablecoin(current_price, market_cap, categories, name);
    const assetWithCategories = await this.assetsRepository.findById(asset.id);
    await this.processAsset(verified, assetWithCategories, category);
  }

  private isStablecoin(
    prices: PricesData,
    marketCap: MarketCapData,
    categories: string[],
    name: string,
  ): boolean {
    const priceCurrency = this.determineFiatCurrency(name, categories);
    return (
      prices[priceCurrency] >= 1 - this.priceDeviation &&
      prices[priceCurrency] <= 1 + this.priceDeviation &&
      marketCap[this.marketCapCurrency] >= this.marketCapThreshold &&
      categories.some((c) => !!c && c.toLowerCase().indexOf('stablecoin') >= 0)
    );
  }

  private determineFiatCurrency(name: string, categories: string[]): string | undefined {
    return this.priceCurrencies.find(
      (currency) =>
        categories.some((c) => !!c && c.toLowerCase().indexOf(currency) >= 0) ||
        name.toLowerCase().indexOf(currency) >= 0,
    );
  }

  private async processAsset(verified: boolean, asset: AssetEntity, category: AssetCategoryEntity) {
    if (verified) {
      if (!this.assetHasCategory(asset, category)) {
        return;
      }
      this.logger.debug(`removing [${category.code}] category for asset [${asset.symbol}]`);
      asset.categories = asset.categories.filter(({ id }) => id !== category.id);
      await this.assetsRepository.save(asset);
      return;
    }

    if (!this.assetHasCategory(asset, category)) {
      this.logger.debug(`adding [${category.code}] category for asset [${asset.symbol}]`);
      asset.categories.push(category);
      await this.assetsRepository.save(asset);
    }
  }

  private assetHasCategory(asset: AssetEntity, category: AssetCategoryEntity): boolean {
    return asset.categories.some(({ id }) => id === category.id);
  }
}
