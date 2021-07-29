import { ApiProperty } from '@nestjs/swagger';

import { AmountAbleDto } from './amount.able.dto';
import { ERC20TokenDto } from './erc20.token.dto';
import { PriceAbleDto } from './price.able.dto';

interface PoolToken extends ERC20TokenDto, PriceAbleDto, AmountAbleDto {}

export class PoolTokenDto implements PoolToken {
  @ApiProperty({ type: String, example: '0x795065dcc9f64b5614c407a6efdc400da6221fb0' })
  address: string;

  @ApiProperty({ type: String, example: '19515604.638277984175730315' })
  reserve: string;

  @ApiProperty({ type: Number, required: false, example: 50 })
  percentage?: number;
}
