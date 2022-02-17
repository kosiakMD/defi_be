import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CollectionStatsDto {
  @Expose({ name: 'floor_price' })
  @ApiProperty({ example: 0.025 })
  floorPrice: number = null; // ETH

  @Expose({ name: 'num_owners' })
  ownersNumber: number = null;

  @Expose()
  count: number = null;
}
