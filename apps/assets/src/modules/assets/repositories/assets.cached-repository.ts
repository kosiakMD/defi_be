import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { CacheService } from '@app/common/services/cache.service';

import { SearchParams } from '../../../common/interfaces/search.interfaces';

import { GetAssetRequest } from '../dto/get-asset.request';
import { AssetEntity } from '../entities/asset.entity';
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
    if (cachedAssets.length === requests.length) {
      return cachedAssets;
    }

    const notCachedAssetsRequests = excludeFoundAssets(requests, cachedAssets);
    const databaseAssets = await this.assetsRepository.findManyByAddressesAndChainIds(
      notCachedAssetsRequests,
    );

    this.saveAssetsToCache(databaseAssets);

    return cachedAssets.concat(databaseAssets);
  }

  private async getCachedAssetsByAddressesAndChainIds(requests: GetAssetRequest[]) {
    const cacheKeys = requests.map(getAssetCacheKey);
    const cachedAssets = await this.cache.mget<AssetEntity>(cacheKeys);
    return cachedAssets.filter((item) => !!item);
  }

  private async saveAssetsToCache(assets: AssetEntity[]) {
    const ttl = this.config.get('cache.assetsTtl');
    const cacheItems = assets.map((asset) => ({ key: getAssetCacheKey(asset), value: asset }));
    await this.cache.mset(cacheItems, { ttl });
  }

  async save(asset: AssetEntity): Promise<AssetEntity> {
    const saved = await this.assetsRepository.save(asset);
    this.cache.set(getAssetCacheKey(saved), saved);
    return saved;
  }
}

function getAssetCacheKey({ address, chainId }: { address: string; chainId: number }) {
  return `asset-${chainId}-${address}`;
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
