import { IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ERC20Token } from '../interfaces';
import { TokenCommonDTO } from './token-common.dto';

export class ERC20TokenDto extends TokenCommonDTO implements ERC20Token {
  @ApiProperty({
    type: String,
    required: false,
    example: '3235740',
  })
  @IsString()
  totalSupply?: string;
}
