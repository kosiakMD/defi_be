import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsNumber, IsString } from 'class-validator';

import { Address, PoolToken, TokenSymbol } from '../interfaces';

export default class PoolTokenDto implements PoolToken {
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  @IsEthereumAddress()
  id: Address;

  @ApiProperty({ type: String, example: 'Wrapped Ether' })
  @IsString()
  name: string;

  @ApiProperty({ type: String, example: 'WETH' })
  @IsString()
  symbol: TokenSymbol;

  @ApiProperty({ type: Number, example: 50 })
  @IsNumber()
  percentage: number;
}
