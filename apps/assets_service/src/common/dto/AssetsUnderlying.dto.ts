import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AssetDto } from './Asset.dto';

@Exclude()
export class AssetUnderlyingDto {
  @Expose()
  @ApiProperty({ type: AssetDto, nullable: true })
  underlyingAsset: Promise<AssetDto> | AssetDto;

  @Expose()
  @ApiProperty({ type: String, nullable: true })
  position: number;
}
