import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { isSomeAddress } from '@app/common/utils/addresses';

export class AssetsGetBulkDto {
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
}
