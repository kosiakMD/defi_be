import { ApiProperty } from '@nestjs/swagger';

export class TokenDto {
  @ApiProperty({ type: String })
  id: string;

  @ApiProperty({ type: String, example: 'fae.df', required: false })
  name?: string;

  @ApiProperty({ type: String, example: 'FDF', required: false })
  symbol?: string;

  @ApiProperty({ type: Number, example: 18, required: false })
  decimals?: number;

  @ApiProperty({ type: Number, example: 50, required: false })
  percentage?: number;

  @ApiProperty({ type: Number, example: 1230.15, required: false })
  reserve?: number;

  @ApiProperty({ type: Number, example: '1033405.00701', required: false })
  totalSupply?: number;

  @ApiProperty({ type: Number, example: 1546852, required: false })
  positionInPool?: number;
}
