import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '../../common/enum';
import { Address } from '../../common/types';

export class AutofarmRequestDto {
  @IsNotEmpty()
  @ApiProperty({
    type: String,
    required: true,
    example: '0xbddab785b306bcd9fb056da189615cc8ece1d823',
  })
  address: Address;

  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  @ApiProperty({
    type: ChainIdEnum,
    example: ChainIdEnum.bsc,
  })
  chain: ChainIdEnum = ChainIdEnum.bsc;
}
