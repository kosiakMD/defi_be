import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { TokenCommon } from '@app/common';

export class TokenCommonDTO implements TokenCommon {
  @ApiProperty({
    type: String,
    required: true,
    example: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ type: String, required: false, example: 'SushiToken' })
  @IsString()
  name?: string;

  @ApiProperty({ type: String, required: false, example: 'SUSHI' })
  @IsString()
  symbol?: string;

  @ApiProperty({ type: Number, required: false, example: 18 })
  @IsNumber()
  decimals?: number;

  @ApiProperty({ type: Boolean, required: false, example: true })
  @IsBoolean()
  isLp?: boolean;
}
