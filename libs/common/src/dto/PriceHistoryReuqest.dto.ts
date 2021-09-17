import { ApiProperty } from '@nestjs/swagger';

import { DateString } from '@app/common/types';

import { TokenHistorical } from '../interfaces';

export default class PriceHistoryRequestDTO implements TokenHistorical {
  @ApiProperty({ type: String })
  addresses: string;

  @ApiProperty({ type: String, isArray: true })
  timestamps: DateString[];
}
