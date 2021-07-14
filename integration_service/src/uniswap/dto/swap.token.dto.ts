import { ApiProperty } from '@nestjs/swagger';

export class SwapTokenDto {
  @ApiProperty({ type: String, example: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' })
  address: string;

  @ApiProperty({ type: String, required: false, example: 'Wrapped Ether' })
  name?: string;

  @ApiProperty({ type: String, required: false, example: 'WETH' })
  symbol?: string;

  @ApiProperty({ type: Number, required: false, example: 18 })
  decimals?: number;

  @ApiProperty({ type: String, required: false, example: '1655.640363905876' })
  totalSupply?: string;
}
