import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetDto } from './asset.dto';

@Exclude()
export class AssetUnderlyingDto {
  @Expose()
  @ApiProperty({ type: () => AssetDto })
  underlyingAsset: AssetDto;

  @Expose()
  @ApiProperty({ type: String })
  position: number;
}
