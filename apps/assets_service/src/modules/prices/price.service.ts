import { Store } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetDto } from '../assets/dto/asset.dto';
import { AssetsRepository } from '../assets/repositories/assets.repository';
import { AssetsService } from '../assets/services/assets.service';
import { AssetPriceEntity } from './entities/asset-price.entity';
import { PriceSourceRepository } from './repositories/price-source.repository';
import { getAssetAveragePricesCacheKey, getAssetPriceCacheKey } from './utils/price-cache.utils';

@Injectable()
export class PriceService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheStore: Store,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsRepository) private assetsRepository: AssetsRepository,
    private readonly assetsService: AssetsService,
    private configService: ConfigService,
    @InjectRepository(PriceSourceRepository)
    private readonly priceSourceRepository: PriceSourceRepository,
  ) {}

  public async calculateAveragePrices(): Promise<void> {
    const assets = await this.assetsRepository.getAllTrackedAssets();

    const priceSources = await this.priceSourceRepository.find({
      where: { enabled: true },
    });

    for (const asset of assets) {
      const { address, chainId } = asset;
      // TODO try to use mget
      const promises = priceSources.map(({ id: sourceId }) =>
        this.cacheStore.get(getAssetPriceCacheKey({ address, chainId, sourceId })),
      );
      const assetAveragePricesCacheKey = getAssetAveragePricesCacheKey({ address, chainId });
      const [assetAveragePrices, ...assetPrices] = await Promise.all([
        this.cacheStore.get(assetAveragePricesCacheKey),
        ...promises,
      ]);
      const priceEntity = new AssetPriceEntity();
      // TODO improve this algorithm to use liquidity or trade volume
      priceEntity.price =
        assetPrices.filter(Boolean).reduce((prev, curr) => prev + Number(curr.price), 0) /
        assetPrices.length;
      priceEntity.timestamp = new Date();
      await Promise.all([
        this.cacheStore.set(
          assetAveragePricesCacheKey,
          [...(assetAveragePrices || []), priceEntity],
          this.configService.get('ASSETS_HISTORICAL_PRICES_DEFAULT_DATE_LIMIT'), // may be it could be less
        ),
        this.assetsService.setAssetsToCache([
          plainToClass(AssetDto, { ...asset, price: priceEntity.price }),
        ]),
      ]);
    }
  }
}
