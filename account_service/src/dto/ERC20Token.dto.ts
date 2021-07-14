import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

import { ERC20Token } from '../common/interfaces';

export class ERC20TokenDto implements ERC20Token {
  @ApiProperty({
    type: String,
    required: true,
    example: '0xf5d669627376ebd411e34b98f19c868c8aba5ada',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ type: String, required: false, example: 'Axie Infinity Shard' })
  @IsString()
  name?: string;

  @ApiProperty({ type: String, required: false, example: 'AXS' })
  @IsString()
  symbol?: string;

  @ApiProperty({ type: Number, required: false, example: 18 })
  @IsNumber()
  decimals?: number;

  @ApiProperty({
    type: String,
    required: false,
    example: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
  })
  @IsString()
  totalSupply?: string;
}
