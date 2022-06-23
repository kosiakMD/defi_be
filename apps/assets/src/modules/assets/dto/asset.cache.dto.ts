import { Exclude, Expose } from 'class-transformer';

import { AssetCategoryEntity } from '../../assets-category/entities/asset-category.entity';
import { AssetMetadata } from '../types/asset-metadata.type';
import { AssetUnderlyingCacheDto } from './asset-underlying-cache.dto';

@Exclude()
export class AssetCacheDto {
  @Expose()
  id: number;

  @Expose()
  chainId: number;

  @Expose()
  address: string;

  @Expose()
  name?: string;

  @Expose()
  symbol?: string;

  @Expose()
  displayName?: string;

  @Expose()
  price?: number;

  @Expose()
  rank?: number;

  @Expose()
  icon?: string;

  @Expose()
  decimals: number;

  @Expose()
  isNotAccounted: boolean;

  @Expose()
  isTracked: boolean;

  @Expose()
  disabled: boolean;

  @Expose()
  categories: AssetCategoryEntity[] = [];

  @Expose()
  underlying: AssetUnderlyingCacheDto[] = [];

  @Expose()
  public metadata: AssetMetadata;

  @Expose()
  updatedAt: Date;

  @Expose()
  createdAt: Date;
}
