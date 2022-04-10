import { ApiProperty } from '@nestjs/swagger';

import { CurrencyEnum, CurrencyIdEnum } from '../enum';

export class CurrencyDto {
  @ApiProperty({ enum: CurrencyIdEnum, example: CurrencyIdEnum.usd })
  id: CurrencyIdEnum;

  @ApiProperty({ enum: CurrencyEnum, example: CurrencyEnum.usd })
  name: CurrencyEnum;
}
