import { ApiProperty } from '@nestjs/swagger';

import { ChainDto, CurrencyDto } from '../../lookup/dto';

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
