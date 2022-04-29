import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class HistoricalPricesQuery {
  @ApiProperty({ type: Boolean, example: 'true', required: false })
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  historicalPrices?: boolean;

  @ApiProperty({
    type: Date,
    example: '2022-04-01',
    required: false,
    description: 'By default the value is less than current date on 48 hours',
  })
  @Transform(({ value }) => new Date(new Date(value).setHours(0, 0, 0, 0)))
  @IsOptional()
  pricesStart?: Date = new Date(
    new Date(Date.now() - Number(process.env.ASSETS_HISTORICAL_PRICES_DEFAULT_DATE_LIMIT)).setHours(
      0,
      0,
      0,
      0,
    ),
  );

  @ApiProperty({
    type: Date,
    example: '2022-04-19',
    required: false,
    description: 'By default the value is current date',
  })
  @Transform(({ value }) => new Date(new Date(value).setHours(23, 59, 59, 999)))
  @IsOptional()
  pricesEnd?: Date = new Date(new Date().setHours(23, 59, 59, 999));
}
