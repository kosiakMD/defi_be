import { ApiProperty } from '@nestjs/swagger';

import { PriceV2DetailedBaseDto } from './price.v2.detailed.base.dto';

export class CurrentPriceV2DetailedDto extends PriceV2DetailedBaseDto {
  @ApiProperty({ type: Number, example: 0.00049968 })
  price: number;
}
