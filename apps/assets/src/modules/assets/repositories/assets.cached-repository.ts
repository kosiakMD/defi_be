import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { CacheService } from '@app/common/services/cache.service';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { AssetDto } from '../dto/asset.dto';
import { GetAssetRequest } from '../dto/get-asset.request';
import { AssetUnderlyingEntity } from '../entities/asset-underlying.entity';
import { AssetEntity } from '../entities/asset.entity';
import { mapAssetsToPlain } from '../utils/cache-mapping';
import { AssetsRepository } from './assets.repository';

@Injectable()
export class AssetsCachedRepository {
  constructor(
    private readonly config: ConfigService,
    private readonly cache: CacheService,
    @InjectRepository(AssetsRepository) private readonly assetsRepository: AssetsRepository,
  ) {}

  findAssetsByParams(searchParams: SearchParams): Promise<AssetEntity[]> {
    return this.assetsRepository.findAssetsByParams(searchParams);
  }

  findOneByAddressAndChain(address: string, chainId: number): Promise<AssetEntity> {
    return this.cache.getOrLoad(getAssetCacheKey({ chainId, address }), () =>
      this.assetsRepository.findOneByAddressAndChain(address, chainId),
    );
  }

  async findManyByAddressesAndChainIds(requests: GetAssetRequest[]): Promise<AssetEntity[]> {
    const cachedAssets = await this.getCachedAssetsByAddressesAndChainIds(requests);

    const assetsToCache = [];
    const notCachedAssetsRequests = excludeFoundAssets(requests, cachedAssets);
    if (notCachedAssetsRequests.length) {
      assetsToCache.push(
        ...(await this.assetsRepository.findManyByAddressesAndChainIds(notCachedAssetsRequests)),
      );
      this.saveAssetsToCache(assetsToCache);
    }

    return cachedAssets.concat(assetsToCache);
  }

  private async getCachedAssetsByAddressesAndChainIds(
    requests: GetAssetRequest[],
  ): Promise<AssetEntity[]> {
    const cacheKeys = requests.map(getAssetCacheKey);
    const cachedAssets = await this.getAssetFromCacheWithUnderlying(cacheKeys);
    return excludeAssetsByRequests(requests, this.mapCachedAssetsToEntities(cachedAssets));
  }

  private async getAssetFromCacheWithUnderlying(cacheKeys: string[]): Promise<AssetDto[]> {
    const cachedAssets = [];
    for (const cachedAsset of (await this.cache.mget<AssetDto>(cacheKeys)).filter(Boolean)) {
      cachedAssets.push(cachedAsset);
      if (cachedAsset.underlying?.length) {
        cachedAssets.push(
          ...(await this.getAssetFromCacheWithUnderlying(
            cachedAsset.underlying.map(({ address }) =>
              getAssetCacheKey({ address, chainId: cachedAsset.chainId }),
            ),
          )),
        );
      }
    }
    return cachedAssets;
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
      if (underlyingAssetDto.underlying) {
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
    const saved = await this.assetsRepository.save(asset);
    this.saveAssetsToCache([saved]);
    return saved;
  }
}

function getAssetCacheKey({ address, chainId }: { address: string; chainId: number }) {
  return `asset-${chainId}-${address}`;
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
