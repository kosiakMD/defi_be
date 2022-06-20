import { plainToClass } from 'class-transformer';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainId } from '@app/common';
import { CacheService } from '@app/common/services/cache.service';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { AssetDto } from '../dto/asset.dto';
import { GetAssetRequest } from '../dto/get-asset.request';
import { AssetUnderlyingEntity } from '../entities/asset-underlying.entity';
import { AssetEntity } from '../entities/asset.entity';
import { mapAssetsToPlain } from '../utils/cache-mapping';
import { AssetsRepository } from './assets.repository';

// TODO: This one is not working, reprocessed metadata missing
@Injectable()
export class AssetsCachedRepository {
  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
  ) {}

  findTrackedAssetsByChain(chainId: ChainId) {
    return this.assetsRepository.findTrackedAssetsByChain(chainId);
  }

  findAssetsByParams(searchParams: SearchParams): Promise<AssetEntity[]> {
    return this.assetsRepository.findAssetsByParams(searchParams);
  }

  async findOneByAddressAndChain(address: string, chainId: number): Promise<AssetEntity> {
    return this.cache.getOrLoad(getAssetCacheKey({ chainId, address }), () =>
      this.assetsRepository.findOneByAddressAndChain(address, chainId),
    );
  }

  findTrackedAssetsWithoutIcon(): Promise<AssetEntity[]> {
    return this.assetsRepository.findTrackedAssetsWithoutIcon();
  }

  // TODO: Optimize this
  async findManyByChainIdAndAddresses(chainId: ChainId, addresses: Address[]) {
    const requests = addresses.map((address) => ({ chainId, address }));
    return this.findManyByAddressesAndChainIds(requests);
  }

  // TODO: We should not use DTO here
  async findManyByAddressesAndChainIds(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const cachedAssets = await this.getCachedAssetsByAddressesAndChainIds(requests);

    const assetsToCache = [];
    const notCachedAssetsRequests = excludeFoundAssets(requests, cachedAssets);
    if (notCachedAssetsRequests.length) {
      assetsToCache.push(
        ...(await this.assetsRepository.findManyByAddressesAndChainIds(notCachedAssetsRequests)),
      );
      this.saveAssetsToCache(assetsToCache).catch((error) =>
        this.logger.error('Failed to save assets to cache', error),
      );
    }

    return cachedAssets.concat(assetsToCache);
  }

  private async getCachedAssetsByAddressesAndChainIds(
    requests: GetAssetRequest[],
  ): Promise<AssetEntity[]> {
    const cacheKeys = requests.map(getAssetCacheKey);
    const cachedAssets = await this.getAssetsFromCacheWithUnderlying(cacheKeys);
    return excludeAssetsByRequests(requests, this.mapCachedAssetsToEntities(cachedAssets));
  }

  private async getAssetsFromCacheWithUnderlying(
    cacheKeys: string[],
    allCacheKeys = [],
  ): Promise<AssetDto[]> {
    // TODO: This is crashing from time to time
    // TODO: We cannot do many awaits here, we should get all missing underlying and load with single call
    const cachedAssets = (await this.cache.mget<AssetDto>(cacheKeys)).filter(Boolean);
    const assetCacheKeys = [];
    for (const cachedAsset of cachedAssets) {
      if (cachedAsset.underlying?.length) {
        cachedAsset.underlying.forEach(({ address }) => {
          const key = getAssetCacheKey({ address, chainId: cachedAsset.chainId });
          if (!allCacheKeys.includes(key)) {
            assetCacheKeys.push(key);
            allCacheKeys.push(key);
          }
        });
      }
    }
    return cachedAssets.concat(
      assetCacheKeys.length
        ? await this.getAssetsFromCacheWithUnderlying(assetCacheKeys, allCacheKeys)
        : [],
    );
  }

  private mapCachedAssetsToEntities(cachedAssets: AssetDto[]): AssetEntity[] {
    const cachedAssetsMap = cachedAssets.reduce((map, assetDto) => {
      map.set(getAssetCacheKey(assetDto), assetDto);
      return map;
    }, new Map<string, AssetDto>());

    const assetEntities = [];

    cachedAssets.forEach((cachedAsset) => {
      const underlying = [];
      if (cachedAsset.underlying?.length) {
        underlying.push(...this.getUnderlying(cachedAsset, cachedAssetsMap));
      }
      assetEntities.push(plainToClass(AssetEntity, { ...cachedAsset, underlying }));
    });
    return assetEntities;
  }

  private getUnderlying(
    cachedAsset: AssetDto,
    cachedAssetsMap: Map<string, AssetDto>,
  ): AssetUnderlyingEntity[] {
    const assetUnderlyingEntities = [];
    cachedAsset.underlying.forEach(({ address, position }) => {
      const assetUnderlyingEntity = new AssetUnderlyingEntity();
      assetUnderlyingEntity.position = position;
      const underlyingAssetDto = cachedAssetsMap.get(
        getAssetCacheKey({ address, chainId: cachedAsset.chainId }),
      );
      const underlying = [];
      if (underlyingAssetDto?.underlying) {
        underlying.push(...this.getUnderlying(underlyingAssetDto, cachedAssetsMap));
      }
      assetUnderlyingEntity.underlyingAsset = plainToClass(AssetEntity, {
        ...underlyingAssetDto,
        underlying,
      });
      assetUnderlyingEntities.push(assetUnderlyingEntity);
    });
    return assetUnderlyingEntities;
  }

  private async saveAssetsToCache(assetsToCache: AssetEntity[]) {
    const ttl = this.config.get('cache.assetsTtl');
    const cacheItems = mapAssetsToPlain(assetsToCache).map((asset) => ({
      key: getAssetCacheKey(asset),
      value: asset,
    }));
    await this.cache.mset(cacheItems, { ttl });
  }

  async save(asset: AssetEntity): Promise<AssetEntity> {
    // TODO: update asset cache mapping to avoid this additional call
    if (asset.id && asset.underlying?.length) {
      const existingUnderlyings = await this.assetsRepository.manager
        .getRepository(AssetUnderlyingEntity)
        .find({
          where: asset.underlying?.map((underlying) => ({
            asset,
            underlyingAsset: underlying.underlyingAsset,
          })),
          relations: ['underlyingAsset'],
        });

      for (const underlying of asset.underlying) {
        const existingUnderlying = existingUnderlyings.find(
          ({ position, underlyingAsset: { address } }) =>
            position === underlying.position && address === underlying.underlyingAsset.address,
        );
        if (existingUnderlying) {
          underlying.id = existingUnderlying.id;
        }
      }
    }

    let saved: AssetEntity;
    if (!asset.id) {
      const a = await this.assetsRepository.findOne({
        where: { address: asset.address, chainId: asset.chainId },
      });
      saved = await this.assetsRepository.save({ ...asset, ...(a ? { id: a.id } : {}) });
    } else {
      saved = await this.assetsRepository.save(asset);
    }
    this.saveAssetsToCache([saved]).catch((error) =>
      this.logger.error(`Saving asset ${asset.address} to cache failed`, error),
    );

    return saved;
  }

  findUniV2LikePairsForTrackedAssets(chainId: ChainId, factory: Address, tokens: Address[]) {
    return this.assetsRepository.findUniV2LikePairsForTrackedAssets(chainId, factory, tokens);
  }
}

function getAssetCacheKey({ address, chainId }: { address: string; chainId: number }) {
  return `asset-${chainId}-${address.toLowerCase()}`;
}

function excludeAssetsByRequests(requests: GetAssetRequest[], assets: AssetEntity[]) {
  return assets.filter((asset) =>
    requests.some((request) => isRequestMatchingAsset(request, asset)),
  );
}

function excludeFoundAssets(requests: GetAssetRequest[], assets: AssetEntity[]) {
  return requests.filter(
    (request) => !assets.some((asset) => isRequestMatchingAsset(request, asset)),
  );
}

function isRequestMatchingAsset(request: GetAssetRequest, asset: AssetEntity) {
  return (
    request.chainId === asset.chainId &&
    request.address?.toLowerCase() === asset.address?.toLowerCase()
  );
}
