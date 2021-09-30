import { ApiProperty } from '@nestjs/swagger';

import { TimestampPriceDto } from './price.timestamp.dto';

export class HistoricalPriceDto {
  @ApiProperty({
    type: TimestampPriceDto,
    example: {
      1617138000: 0.001164317707510157,
      1617224400: 0.001164317707510157,
    },
    required: false,
  })
  '0xbddab785b306bcd9fb056da189615cc8ece1d823': TimestampPriceDto;
}
