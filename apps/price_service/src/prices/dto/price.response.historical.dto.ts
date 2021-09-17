import { ApiProperty } from '@nestjs/swagger';

import { HistoricalPriceDto } from '../../lookup/dto';
import { PriceBaseResponseDto } from './price.response.base.dto';

export class HistoricalPriceResponseDto extends PriceBaseResponseDto {
  @ApiProperty({
    type: Object,
    example: {
      '0xbddab785b306bcd9fb056da189615cc8ece1d823': {
        1617138000: 0.001164317707510157,
        1617224400: 0.001164317707510157,
      },
    },
  })
  prices: HistoricalPriceDto;
}
