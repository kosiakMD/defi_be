import { ApiProperty } from '@nestjs/swagger';

export class LiquidityPoolDto {
  @ApiProperty({ type: String, example: 'fae.df' })
  name: string;

  @ApiProperty({
    type: String,
    example: '0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d',
    required: false,
  })
  address?: string;
}
