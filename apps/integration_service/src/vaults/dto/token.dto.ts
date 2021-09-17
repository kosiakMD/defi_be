import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({ type: String, example: 68 })
  id: string;

  @ApiProperty({ type: String, example: 'fae.df', required: false })
  name?: string;

  @ApiProperty({ type: String, example: 'FDF', required: false })
  symbol?: string;

  @ApiProperty({ type: Number, example: 18, required: false })
  decimals?: number;

  @ApiProperty({ type: Number, example: 50, required: false })
  percentage?: number;

  @ApiProperty({ type: Number, example: 1.002045188, required: false })
  reserve?: number;

  @ApiProperty({ type: Number, example: 2502.751309, required: false })
  priceUSD?: number;

  @ApiProperty({ type: Number, example: 3048.85054, required: false })
  totalSupply?: number;
}
