import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NftAssetDto } from '.';
import { CollectionBaseDto } from './collection.base.dto';

@Exclude()
export class CollectionDto extends CollectionBaseDto {
  @Expose()
  @Type(() => NftAssetDto)
  @ApiProperty({ type: () => [NftAssetDto] })
  assets: NftAssetDto[] = null;
}
