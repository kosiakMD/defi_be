import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class ERC20Token {
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  @Expose()
  address: string;
  @ApiProperty({ type: String, example: 'Ethereum' })
  @Expose()
  name: string;
  @ApiProperty({ type: String, example: 'ETH' })
  @Expose()
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  @Expose()
  decimals: number;
  @ApiProperty({ type: String, example: '69393241' })
  @Expose()
  totalSupply?: string;
}
