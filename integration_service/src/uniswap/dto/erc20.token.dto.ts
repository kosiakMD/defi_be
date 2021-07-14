import { ApiProperty } from '@nestjs/swagger';

export class ERC20TokenDto {
  @ApiProperty({ type: String, example: '0x795065dcc9f64b5614c407a6efdc400da6221fb0' })
  address: string;

  @ApiProperty({ type: String, example: 'fae.df', required: false })
  name?: string;

  @ApiProperty({ type: String, example: 'FDF', required: false })
  symbol?: string;

  @ApiProperty({ type: Number, example: 18, required: false })
  decimals?: number;

  @ApiProperty({ type: String, example: '1033405.007016168557863923', required: false })
  totalSupply?: string;
}
