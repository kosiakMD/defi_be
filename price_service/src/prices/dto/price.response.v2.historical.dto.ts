import { ApiProperty } from '@nestjs/swagger';
import { HistoricalPriceV2Dto } from 'src/lookup/dto';

import { PriceBaseResponseDto } from './price.response.base.dto';

export class HistoricalPriceV2ResponseDto extends PriceBaseResponseDto {
  @ApiProperty({ type: HistoricalPriceV2Dto })
  prices: HistoricalPriceV2Dto;
}
