import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CacheService } from '@app/common/services/cache.service';

import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetHistoricalPriceEntity } from './entities/asset-historical-price.entity';
import { AssetsHistoricalPriceRepository } from './repositories/asset-historical-price.repository';
import { AssetPrice } from './types/asset-price.type';

@Injectable()
export class PriceService {
  constructor(
    @InjectRepository(AssetsRepository)
    private readonly assetsRepository: AssetsRepository,
    @InjectRepository(AssetsHistoricalPriceRepository)
    private readonly assetsHistoricalPriceRepository: AssetsHistoricalPriceRepository,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {}

  public async saveAssetPrices(prices: AssetPrice[]) {
    this.logger.log(`Saving ${prices.length} prices into cache`);

    const assetPricesTTLInSeconds = this.config.get<number>('ASSET_PRICES_CACHE_TTL') || 60 * 60;
    const assetPricesTTLInMs = assetPricesTTLInSeconds * 1000;
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
    await this.cache.mset(sourcePriceCacheItems, { ttl: assetPricesTTLInSeconds });

    // NOTE: Average price stored separately for easier retrieval
    const averagePrices = updatedPrices.map(calculateAveragePrice).filter(({ price }) => price);
    const avgPriceCacheItems = averagePrices.map(toAvgPriceCacheItem);
    await this.cache.mset(avgPriceCacheItems, { ttl: assetPricesTTLInSeconds });

    this.logger.log(`Saved ${notEmptyUpdatedPrices.length} not empty prices into cache`);
  }

  public async saveHistoricalPricesFromCurrentOnes() {
    const cachedAveragePrices = await this.getPrices(
      (
        await this.cache.getKeysByPattern('asset_avg_price_*')
      ) //
        .map((key) => getAssetReferenceFromAveragePriceCacheKey(key)),
    );
    const getAssetKey = ({ address, chainId }) => `${chainId}-${address}`;
    const trackedAssetsMap = new Map(
      (await this.assetsRepository.getAllTrackedAssets()) //
        .map((trackedAsset) => [getAssetKey(trackedAsset), trackedAsset]),
    );
    const promises = [];
    while (cachedAveragePrices.length) {
      const averagePricesChunk = cachedAveragePrices.splice(0, 500);
      promises.push(
        this.assetsHistoricalPriceRepository.insert(
          averagePricesChunk
            .map((averagePrice) => {
              const newHistoricalPrice = new AssetHistoricalPriceEntity();
              newHistoricalPrice.asset = trackedAssetsMap.get(getAssetKey(averagePrice.asset));
              newHistoricalPrice.price = averagePrice.price;
              newHistoricalPrice.timestamp = new Date();
              return newHistoricalPrice;
            })
            .filter((newHistoricalPrice) => !!newHistoricalPrice.asset),
        ),
      );
    }
    await Promise.all(promises);
  }

  async getPrices(assets: AssetReference[]): Promise<AssetAvgPrice[]> {
    const avgPricesCacheKeys = assets.map(getAvgPriceCacheKey);
    const cachedAssetPrices = await this.cache.mget<number>(avgPricesCacheKeys);
    return cachedAssetPrices.map((price, index) => ({ price, asset: assets[index] }));
  }
}

type PriceMap = Map<string, AssetPrice>;

type AssetReference = {
  chainId: number;
  address: string;
};

type SourceAssetPrice = {
  sourceId: number;
  price: number;
  timestamp: number;
};

type AssetPrices = {
  asset: AssetReference;
  prices: SourceAssetPrice[];
};

type AssetAvgPrice = {
  asset: AssetReference;
  price: number;
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
      ({ sourceId, timestamp }) => sourceId !== updatedPrice.sourceId || timestamp < expiredAt,
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

function toAvgPriceCacheItem({ asset, price }: AssetAvgPrice) {
  return {
    key: getAvgPriceCacheKey(asset),
    value: price,
  };
}

function getAssetReferenceFromAveragePriceCacheKey(key: string): AssetReference {
  const keyEntries = key.split('_');
  return {
    address: keyEntries.pop(),
    chainId: +keyEntries.pop(),
  };
}

const getPriceMapKey = ({ chainId, address }: AssetReference) => `${chainId}_${address}`;

const getSourcePricesCacheKey = ({ chainId, address }: AssetReference) =>
  `asset_source_prices_${chainId}_${address}`;

const getAvgPriceCacheKey = ({ chainId, address }: AssetReference) =>
  `asset_avg_price_${chainId}_${address}`;
