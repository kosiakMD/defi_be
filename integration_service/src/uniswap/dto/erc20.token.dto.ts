import { ApiProperty } from '@nestjs/swagger';

export class ERC20TokenDto {
  @ApiProperty({ type: String, example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d' })
  address: string;

  @ApiProperty({ type: String, example: 'fae.df', required: false })
  name: string;

  @ApiProperty({ type: String, example: 'FDF', required: false })
  symbol: string;

  @ApiProperty({ type: Number, example: 18, required: false })
  decimals: number;

  @ApiProperty({ type: String, example: '1033405.00701', required: false })
  totalSupply?: string;
}
