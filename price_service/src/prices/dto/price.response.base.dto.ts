import { ChainDto, CurrencyDto } from 'src/lookup/dto';

import { ApiProperty } from '@nestjs/swagger';

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
