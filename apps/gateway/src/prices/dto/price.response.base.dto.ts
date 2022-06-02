import { ApiProperty } from '@nestjs/swagger';

import { ChainDto } from './chain.dto';
import { CurrencyDto } from './currency.dto';

export class PriceBaseResponseDto {
  @ApiProperty({
    type: ChainDto,
  })
  chain: ChainDto;

  @ApiProperty({
    type: CurrencyDto,
  })
  currency: CurrencyDto;
}
