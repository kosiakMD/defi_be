import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;
}
