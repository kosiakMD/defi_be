import { ApiProperty } from '@nestjs/swagger';

import { TimestampPriceDto } from './price.timestamp.dto';
import { PriceV2DetailedBaseDto } from './price.v2.detailed.base.dto';

export class HistoricalPriceV2DetailedDto extends PriceV2DetailedBaseDto {
  @ApiProperty({
    type: TimestampPriceDto,
    example: {
      1617138000: 0.001164317707510157,
      1617224400: 0.001164317707510157,
    },
  })
  prices: TimestampPriceDto;
}
