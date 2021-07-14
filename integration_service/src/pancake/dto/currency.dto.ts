import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'usd' })
  name: string;
}
