import { plainToClass } from 'class-transformer';

import { AssetCategoryDto } from '../dto/asset-category.dto';
import { AssetDto } from '../dto/asset.dto';
import { AssetEntity } from '../entities/asset.entity';

// TODO: This should not be in utils
function getAssetDtosWithUnderlyingReferences(asset: AssetEntity): AssetDto[] {
  const underlyingAssetDtos = [];
  const assetDto = plainToClass(AssetDto, asset);
  // TODO: Holly crap what are we doing here
  asset.categories?.forEach((category, index) => {
    assetDto.categories[index] = plainToClass(AssetCategoryDto, category);
  });

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
