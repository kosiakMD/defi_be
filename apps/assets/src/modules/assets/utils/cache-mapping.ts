import { plainToClass } from 'class-transformer';

import { AssetDto } from '../dto/asset.dto';
import { AssetEntity } from '../entities/asset.entity';

function getAssetDtosWithUnderlyingReferences(asset: AssetEntity): AssetDto[] {
  const underlyingAssetDtos = [];
  const assetDto = plainToClass(AssetDto, asset);
  asset.underlying?.forEach((underlying, index) => {
    const { position, underlyingAsset } = underlying;
    if (underlyingAsset.underlying?.length) {
      underlyingAssetDtos.push(...getAssetDtosWithUnderlyingReferences(underlyingAsset));
    } else {
      underlyingAssetDtos.push(plainToClass(AssetDto, underlyingAsset));
    }
    assetDto.underlying[index] = {
      address: underlyingAsset.address,
      position,
    };
  });
  underlyingAssetDtos.push(assetDto);
  return underlyingAssetDtos;
}

export function mapAssetsToPlain(cachedAssets: AssetEntity[]): AssetDto[] {
  const assetsToCache = [];
  cachedAssets.forEach((cachedAsset) => {
    assetsToCache.push(...getAssetDtosWithUnderlyingReferences(cachedAsset));
  });
  return assetsToCache;
}
