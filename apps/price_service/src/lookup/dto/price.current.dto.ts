import { ApiProperty } from '@nestjs/swagger';

export class CurrentPriceDto {
  @ApiProperty({ type: Number, example: 0.02152976, required: false })
  '0xbddab785b306bcd9fb056da189615cc8ece1d823': number;
}
