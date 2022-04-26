import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { isSomeAddress } from '@app/common/utils/addresses';

export class AssetsGetDto {
  @ApiProperty({ type: Number, example: 10 })
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  chainId: number;

  @ApiProperty({ type: String, example: '0xe41d2489571d322189246dafa5ebde1f4699f498' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => {
    if (isSomeAddress(value)) {
      return value;
    } else {
      throw new Error(`Incorrect address ${value}`);
    }
  })
  address: string;

  @ApiProperty({ type: Boolean, example: 'true', required: false })
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  historicalPrices?: boolean;

  @ApiProperty({ type: Date, example: '2022-04-01', required: false })
  @Transform(({ value }) => new Date(new Date(value).setHours(0, 0, 0, 0)))
  @IsOptional()
  pricesStart?: Date = new Date(
    Date.now() - Number(process.env.ASSETS_HISTORICAL_PRICES_DEFAULT_DATE_LIMIT),
  );

  @ApiProperty({ type: Date, example: '2022-04-19', required: false })
  @Transform(({ value }) => new Date(new Date(value).setHours(23, 59, 59, 999)))
  @IsOptional()
  pricesEnd?: Date = new Date();
}
