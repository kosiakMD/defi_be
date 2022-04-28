import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetsPriceDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1011 })
  id: number;

  @Expose()
  @ApiProperty({ type: Number })
  price: number;

  @Expose()
  @ApiProperty({ type: Number })
  sourceId: number;

  @Expose()
  @ApiProperty({ type: Date })
  timestamp: Date;
}
