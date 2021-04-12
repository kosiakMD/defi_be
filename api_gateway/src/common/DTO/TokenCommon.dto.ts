import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

import { ERC20Token } from '../interfaces';

export class TokenCommon implements ERC20Token {
  @ApiProperty({ type: String, required: true })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ type: String, required: false })
  @IsString()
  name?: string;

  @ApiProperty({ type: String, required: false })
  @IsString()
  symbol?: string;

  @ApiProperty({ type: Number, required: false })
  @IsNumber()
  decimals?: number;
}
