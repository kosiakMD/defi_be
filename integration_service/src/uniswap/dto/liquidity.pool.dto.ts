import { ApiProperty } from '@nestjs/swagger';

export class LiquidityPoolDto {
  @ApiProperty({ type: String, example: 'Pepega Pool' })
  name: string;

  @ApiProperty({
    type: String,
    example: '0x975F10314CdFA9256012335719d3085435962439',
    required: false,
  })
  address?: string;
}
