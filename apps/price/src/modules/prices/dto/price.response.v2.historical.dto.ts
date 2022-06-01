import { ApiProperty } from '@nestjs/swagger';

import { PriceBaseResponseDto } from './price.response.base.dto';
import { HistoricalPriceV2Dto } from './price.v2.historical.dto';

export class HistoricalPriceV2ResponseDto extends PriceBaseResponseDto {
  @ApiProperty({
    type: Object,
    example: {
      '0xbddab785b306bcd9fb056da189615cc8ece1d823': {
        1617138000: 0.001164317707510157,
        1617224400: 0.001164317707510157,
      },
    },
  })
  prices: HistoricalPriceV2Dto;
}
