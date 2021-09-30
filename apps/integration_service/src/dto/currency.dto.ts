import { ApiProperty } from '@nestjs/swagger';

import { CurrencyEnum, CurrencyIdEnum } from '@app/common/enum';

export class CurrencyDto {
  @ApiProperty({ enum: CurrencyIdEnum, enumName: 'CurrencyIdEnum', example: CurrencyIdEnum.usd })
  id: CurrencyIdEnum = CurrencyIdEnum.usd;

  @ApiProperty({ enum: CurrencyEnum, enumName: 'CurrencyEnum', example: CurrencyEnum.usd })
  name: CurrencyEnum = CurrencyEnum.usd;
}
