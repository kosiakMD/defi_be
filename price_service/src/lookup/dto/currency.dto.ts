import { ApiProperty } from '@nestjs/swagger';

import { CurrencyEnum, CurrencyIdEnum } from 'src/common/enum';

export class CurrencyDto {
  @ApiProperty({ enum: CurrencyIdEnum, example: CurrencyIdEnum.usd })
  id: CurrencyIdEnum;

  @ApiProperty({ enum: CurrencyEnum, enumName: 'CurrencyEnum', example: CurrencyEnum.usd })
  name: CurrencyEnum;
}
