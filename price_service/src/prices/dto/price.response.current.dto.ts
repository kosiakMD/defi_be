import { CurrentPriceDto } from 'src/lookup/dto';

import { ApiProperty } from '@nestjs/swagger';

import { PriceBaseResponseDto } from './price.response.base.dto';

export class CurrentPriceResponseDto extends PriceBaseResponseDto {
  @ApiProperty({
    type: Object,
    example: { '0xbddab785b306bcd9fb056da189615cc8ece1d823': 0.02152976 },
  })
  prices: CurrentPriceDto;
}
