import { ApiProperty } from '@nestjs/swagger';

import { CurrentPriceV2DetailedDto } from './price-v2-current-detailed.dto';

export class CurrentPriceV2Dto {
  @ApiProperty({ type: CurrentPriceV2DetailedDto, required: false })
  '0xbddab785b306bcd9fb056da189615cc8ece1d823': CurrentPriceV2DetailedDto;
}
