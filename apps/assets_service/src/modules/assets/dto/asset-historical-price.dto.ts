import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AssetHistoricalPriceDto {
  @Expose()
  @ApiProperty({ type: Number })
  open: number;

  @Expose()
  @ApiProperty({ type: Number })
  high: number;

  @Expose()
  @ApiProperty({ type: Number })
  low: number;

  @Expose()
  @ApiProperty({ type: Number })
  close: number;

  @Expose()
  @ApiProperty({ type: Number })
  ticks: number;

  @Expose()
  @ApiProperty({ type: Number })
  timeGranularity: number;

  @Expose()
  @ApiProperty({ type: Date })
  timestamp: Date;
}
