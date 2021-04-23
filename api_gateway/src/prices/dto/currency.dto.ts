import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'usd' })
  name: string;
}