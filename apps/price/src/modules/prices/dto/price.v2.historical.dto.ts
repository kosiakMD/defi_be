import { ApiProperty } from '@nestjs/swagger';

import { HistoricalPriceV2DetailedDto } from './price.v2.historical.detailed.dto';

export class HistoricalPriceV2Dto {
  @ApiProperty({ type: HistoricalPriceV2DetailedDto, required: false })
  '0xbddab785b306bcd9fb056da189615cc8ece1d823': HistoricalPriceV2DetailedDto;
}
