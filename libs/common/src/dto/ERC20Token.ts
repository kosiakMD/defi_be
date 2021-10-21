import { ApiProperty } from '@nestjs/swagger';

export class ERC20Token {
  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  address: string;
  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;
  @ApiProperty({ type: String, example: 'ETH' })
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
  @ApiProperty({ type: String, example: '69393241' })
  totalSupply?: string;
}