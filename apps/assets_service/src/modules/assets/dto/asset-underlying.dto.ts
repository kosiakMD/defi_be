import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetReference } from '../repositories/assets.repository';
import { AssetDto } from './asset.dto';

@Exclude()
export class AssetUnderlyingDto {
  @Exclude()
  @ApiProperty({ type: () => AssetDto })
  underlyingAsset?: AssetDto;

  @Expose()
  @ApiProperty({ type: () => Object })
  underlyingAssetRef?: AssetReference;

  @Expose()
  @ApiProperty({ type: Number })
  position: number;
}
