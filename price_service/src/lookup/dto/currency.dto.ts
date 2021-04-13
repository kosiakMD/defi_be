import { ApiProperty } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}
