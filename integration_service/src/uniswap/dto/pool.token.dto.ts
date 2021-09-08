import { ApiProperty } from '@nestjs/swagger';

import { AmountAbleDto } from './amount.able.dto';
import { ERC20TokenDto } from './erc20.token.dto';
import { PriceAbleDto } from './price.able.dto';

interface PoolToken extends ERC20TokenDto, PriceAbleDto, AmountAbleDto {}

export class PoolTokenDto extends ERC20TokenDto implements PoolToken {
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  address: string;

  @ApiProperty({ type: String, example: '19515604.6385' })
  reserve: string;

  @ApiProperty({ type: Number, required: false, example: 50 })
  percentage?: number;
}
