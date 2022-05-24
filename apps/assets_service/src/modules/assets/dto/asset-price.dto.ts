import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetPriceDto {
  @Expose()
  @ApiProperty({ type: Number })
  price: number;

  @Expose()
  @ApiProperty({ type: Date })
  timestamp: Date;

  @Expose()
  @ApiProperty({ type: Number })
  sourceId: number;
}
