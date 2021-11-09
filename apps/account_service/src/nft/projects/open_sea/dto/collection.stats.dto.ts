import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CollectionStatsDto {
  @Expose({ name: 'average_price' })
  @ApiProperty({ example: 0.5 })
  averagePrice: number; // ETH

  @Expose({ name: 'floor_price' })
  @ApiProperty({ example: 0.025 })
  floorPrice: number; // ETH
}
