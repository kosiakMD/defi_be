import { ApiProperty } from '@nestjs/swagger';
import { CurrentPriceV2Dto } from 'src/lookup/dto';

import { PriceBaseResponseDto } from './price.response.base.dto';

export class CurrentPriceV2ResponseDto extends PriceBaseResponseDto {
  @ApiProperty({ type: CurrentPriceV2Dto })
  prices: CurrentPriceV2Dto;
}
