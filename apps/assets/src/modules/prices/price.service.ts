import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CacheService } from '@app/common/services/cache.service';
import { chunkRunAsync } from '@app/common/utils';

import { AssetReference } from '../../common/types';

import { AssetDto } from '../assets/dto/asset.dto';
import { AssetEntity } from '../assets/entities/asset.entity';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetHistoricalPriceEntity } from './entities/asset-historical-price.entity';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { AssetPrice } from './types/asset-price.type';

@Injectable()
export class PriceService {
  private readonly assetPricesTTLInSeconds: number;
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetsRepository: AssetsRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    this.assetPricesTTLInSeconds = this.config.get<number>('ASSET_PRICES_CACHE_TTL');
  }

  public async saveAssetPrices(prices: AssetPrice[]) {
    this.logger.log(`Saving ${prices.length} prices into cache`);

    const assetPricesTTLInMs = this.assetPricesTTLInSeconds * 1000;
    const expiredPricesTimestamp = Date.now() - assetPricesTTLInMs;

    const sourcePricesCacheKeys = prices.map(getSourcePricesCacheKey);
    const priceMap = createPriceMap(prices);

    // NOTE: All source prices per asset are stored as single cache item to reduce number of cache calls
    // Because of this we need to expire some source items manually
    const cachedAssetPrices = await this.cache.mget<AssetPrices>(sourcePricesCacheKeys);
    const updatedPrices = cachedAssetPrices.map<AssetPrices>((price, index) =>
      updatePrices(price || emptyPrices(prices[index]), priceMap, expiredPricesTimestamp),
    );
    const notEmptyUpdatedPrices = updatedPrices.filter(({ prices }) => prices?.length > 0);
    const sourcePriceCacheItems = notEmptyUpdatedPrices.map(toSourcePricesCacheItem);
    await this.cache.mset(sourcePriceCacheItems, { ttl: this.assetPricesTTLInSeconds });

    // NOTE: Average price stored separately for easier retrieval
    const averagePrices = updatedPrices.map(calculateAveragePrice).filter(({ price }) => price);
    const avgPriceCacheItems = averagePrices.map(toAvgPriceCacheItem);
    await this.cache.mset(avgPriceCacheItems, { ttl: this.assetPricesTTLInSeconds });

    this.logger.log(`Saved ${notEmptyUpdatedPrices.length} not empty prices into cache`);
  }

  public async saveHistoricalPricesFromCurrentOnes() {
    const trackedAssets = await this.assetsRepository.findAllTrackedAssets();
    await chunkRunAsync(trackedAssets, 500, this.insertChunkAssetPrices.bind(this));
  }

  public async saveSpecificAssetPrices(dtosToUpdatePricesInCache: AssetDto[]) {
    const priceCacheItems = dtosToUpdatePricesInCache
      .filter(({ price }) => price)
      .map(({ address, chainId, price, underlying }) => {
        const assetAvgPrice = {
          asset: { address, chainId },
          price,
          reserves: [],
        };
        underlying?.forEach(({ reserve }) => {
          if (reserve) {
            assetAvgPrice.reserves.push(reserve);
          }
        });
        return toAvgPriceCacheItem(assetAvgPrice);
      });
    await this.cache.mset(priceCacheItems, { ttl: this.assetPricesTTLInSeconds });
  }

  private async insertChunkAssetPrices(trackedAssetsChunk: AssetEntity[]) {
    const assetsPricesMap = getPriceMap(
      (await this.getPrices(trackedAssetsChunk)).filter((assetPrice) => assetPrice.price),
    );
    await this.assetsHistoricalPriceRepository.insert(
      trackedAssetsChunk
        // need to avoid null prices
        .filter((asset) => assetsPricesMap[getPriceMapKey(asset)])
        .map((trackedAsset) => {
          const newHistoricalPrice = new AssetHistoricalPriceEntity();
          newHistoricalPrice.asset = trackedAsset;
          newHistoricalPrice.price = assetsPricesMap[getPriceMapKey(trackedAsset)].price;
          newHistoricalPrice.timestamp = new Date();
          return newHistoricalPrice;
        })
        .filter((newHistoricalPrice) => !!newHistoricalPrice.asset),
    );
  }

  async getPrices(assets: AssetReference[]): Promise<AssetAvgPrice[]> {
    const avgPricesCacheKeys = assets.map(getAvgPriceCacheKey);
    const cachedAssetPrices = await this.cache.mget<AvgPrice>(avgPricesCacheKeys);
    return cachedAssetPrices.map((value, index) => ({
      price: value?.price,
      reserves: value?.reserves,
      asset: assets[index],
    }));
  }
}

type PriceMap = Map<string, AssetPrice>;

export type SourceAssetPrice = {
  sourceId: number;
  price: number;
  timestamp: number;
};

export type AssetPrices = {
  asset: AssetReference;
  prices: SourceAssetPrice[];
};

export type AssetAvgPrice = {
  asset: AssetReference;
  price: number;
  reserves?: string[];
};

type AvgPrice = {
  price: number;
  reserves?: string[];
};

function createPriceMap(prices: AssetPrice[]): PriceMap {
  const map = new Map<string, AssetPrice>();

  for (const price of prices) {
    map.set(getPriceMapKey(price), price);
  }

  return map;
}

function emptyPrices(asset: AssetReference): AssetPrices {
  return {
    asset,
    prices: [],
  };
}

function updatePrices(ap: AssetPrices, priceMap: PriceMap, expiredAt: number): AssetPrices {
  const { asset, prices } = ap;
  const { chainId, address } = asset;
  const priceMapKey = getPriceMapKey(asset);
  const updatedPrice = priceMap.get(priceMapKey);

  if (!updatedPrice.price) {
    return {
      asset: { chainId, address },
      prices,
    };
  }

  const updatedPrices = prices
    .filter(
      ({ sourceId, timestamp }) => sourceId !== updatedPrice.sourceId && timestamp >= expiredAt,
    )
    .concat({
      price: updatedPrice.price,
      sourceId: updatedPrice.sourceId,
      timestamp: Date.now(),
    });

  return {
    asset: { chainId, address },
    prices: updatedPrices,
  };
}

function calculateAveragePrice({ asset, prices = [] }: AssetPrices): AssetAvgPrice {
  const { chainId, address } = asset;
  // TODO: Update this one to count volume, as of now base on all prices sources
  return {
    asset: { chainId, address },
    price: prices.length ? prices.reduce((sum, cur) => sum + cur.price, 0) / prices.length : null,
  };
}

function toSourcePricesCacheItem(assetPrices: AssetPrices) {
  return {
    key: getSourcePricesCacheKey(assetPrices.asset),
    value: assetPrices,
  };
}

function toAvgPriceCacheItem({ asset, price, reserves }: AssetAvgPrice) {
  return {
    key: getAvgPriceCacheKey(asset),
    value: { price, reserves },
  };
}

function getPriceMap(prices: AssetAvgPrice[]) {
  return prices.reduce((priceMap, assetPrice) => {
    priceMap[getPriceMapKey(assetPrice.asset)] = assetPrice;
    return priceMap;
  }, {});
}

const getPriceMapKey = ({ chainId, address }: AssetReference) =>
  `${chainId}_${address.toLowerCase()}`;

const getSourcePricesCacheKey = ({ chainId, address }: AssetReference) =>
  `asset_source_prices_${chainId}_${address.toLowerCase()}`;

const getAvgPriceCacheKey = ({ chainId, address }: AssetReference) =>
  `asset_avg_price_${chainId}_${address.toLowerCase()}`;
