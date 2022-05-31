import { ApiProperty } from '@nestjs/swagger';

import { TokenSymbol, PlatformPoolToken } from '@app/common';

export class PlatformPoolTokenDto implements PlatformPoolToken {
  @ApiProperty({ type: String, example: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f' })
  address: string;

  @ApiProperty({ type: String, example: '175609.73128109136180813' })
  reserve: string;

  @ApiProperty({ type: String, example: 'Synthetix Network Token', required: false })
  name: string;

  @ApiProperty({ type: String, example: 'SNX', required: false })
  symbol: TokenSymbol;

  @ApiProperty({ type: Number, example: 50, required: false })
  percentage: number;

  @ApiProperty({ type: Number, example: 18, required: false })
  decimals: number;

  @ApiProperty({ type: String, example: '27560900', required: false })
  totalSupply: string;

  @ApiProperty({ type: Number, example: 9.07997544843182, required: false })
  priceUSD?: number;

  // TODO should be required
  @ApiProperty({ type: String, example: '0', required: false })
  amount?: string;
}
