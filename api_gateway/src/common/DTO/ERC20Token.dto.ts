import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { ERC20Token } from '../interfaces';
import { TokenCommon } from './TokenCommon.dto';

export class ERC20TokenDto extends TokenCommon implements ERC20Token {
  @ApiProperty({
    type: String,
    required: false,
    example: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
  })
  @IsString()
  totalSupply?: string;
}
