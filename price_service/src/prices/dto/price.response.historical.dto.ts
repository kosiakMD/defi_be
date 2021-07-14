import { ApiProperty } from '@nestjs/swagger';
import { HistoricalPriceDto } from 'src/lookup/dto';

import { PriceBaseResponseDto } from './price.response.base.dto';

export class HistoricalPriceResponseDto extends PriceBaseResponseDto {
  @ApiProperty({ type: HistoricalPriceDto })
  prices: HistoricalPriceDto;
}
