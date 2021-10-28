import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum } from '@app/common';

import { CollectionDto } from '.';

@Exclude()
export class NftChainDto {
  @Expose()
  @ApiProperty({ enum: Object.values(ChainIdEnum).filter(Number) })
  id: ChainIdEnum;

  @Expose()
  @ApiProperty({ enum: ChainAbbrEnum })
  abbr: ChainAbbrEnum;

  @Expose()
  @ApiProperty({ type: () => [CollectionDto] })
  collections: CollectionDto[];
}
