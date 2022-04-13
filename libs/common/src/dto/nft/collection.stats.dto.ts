import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CollectionStatsDto {
  @Expose()
  @ApiProperty({ example: 0.025, description: 'ETH' })
  floorPrice: number = null;

  @Expose()
  @ApiProperty({ example: 1337 })
  ownersNumber: number = null;

  @Expose()
  @ApiProperty({ example: 4520, description: 'Total number of minted assets' })
  count: number = null;
}
