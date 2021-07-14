import { ApiProperty } from '@nestjs/swagger';
import { CurrentPriceDto } from 'src/lookup/dto';

import { PriceBaseResponseDto } from './price.response.base.dto';

export class CurrentPriceResponseDto extends PriceBaseResponseDto {
  @ApiProperty({ type: CurrentPriceDto })
  prices: CurrentPriceDto;
}
