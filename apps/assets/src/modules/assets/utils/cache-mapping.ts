import { plainToClass } from 'class-transformer';

import { AssetCategoryDto } from '../dto/asset-category.dto';
import { AssetCacheDto } from '../dto/asset.cache.dto';
import { AssetDto } from '../dto/asset.dto';
import { AssetEntity } from '../entities/asset.entity';

// TODO: This should not be in utils
function getAssetCacheDtosWithUnderlyingReferences(asset: AssetEntity): AssetCacheDto[] {
  const underlyingAssetDtos = [];
  const assetDto = plainToClass(AssetCacheDto, asset);
  asset.underlying?.forEach((underlying, index) => {
    const { position, underlyingAsset } = underlying;
    if (underlyingAsset.underlying?.length) {
      underlyingAssetDtos.push(...getAssetCacheDtosWithUnderlyingReferences(underlyingAsset));
    } else {
      underlyingAssetDtos.push(plainToClass(AssetCacheDto, underlyingAsset));
    }
    assetDto.underlying[index] = {
      id: underlying.id,
      address: underlyingAsset.address,
      position,
    };
  });
  underlyingAssetDtos.push(assetDto);
  return underlyingAssetDtos;
}

function getAssetAPIDtosWithUnderlyingReferences(asset: AssetEntity): AssetDto[] {
  const underlyingAssetDtos = [];
  const assetDto = plainToClass(AssetDto, asset);
  // TODO: Holly crap what are we doing here
  asset.categories?.forEach((category, index) => {
    assetDto.categories[index] = plainToClass(AssetCategoryDto, category);
  });

  asset.underlying?.forEach((underlying, index) => {
    const { position, underlyingAsset } = underlying;
    if (underlyingAsset.underlying?.length) {
      underlyingAssetDtos.push(...getAssetAPIDtosWithUnderlyingReferences(underlyingAsset));
    } else {
      underlyingAssetDtos.push(plainToClass(AssetDto, underlyingAsset));
    }
    assetDto.underlying[index] = {
      address: underlyingAsset.address,
      position,
    };
    assetDto.categories = asset.categories.map((c) => plainToClass(AssetCategoryDto, c));
  });
  underlyingAssetDtos.push(assetDto);
  return underlyingAssetDtos;
}

export function mapAssetsToAPIPlain(cachedAssets: AssetEntity[]): AssetDto[] {
  const assetsToCache = [];
  cachedAssets.forEach((cachedAsset) => {
    assetsToCache.push(...getAssetAPIDtosWithUnderlyingReferences(cachedAsset));
  });
  return assetsToCache;
}

export function mapAssetsToCachePlain(cachedAssets: AssetEntity[]): AssetDto[] {
  const assetsToCache = [];
  cachedAssets.forEach((cachedAsset) => {
    assetsToCache.push(...getAssetCacheDtosWithUnderlyingReferences(cachedAsset));
  });
  return assetsToCache;
}
