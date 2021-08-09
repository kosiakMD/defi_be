import { ApiProperty } from '@nestjs/swagger';

import { CurrencyEnum, CurrencyIdEnum } from '../../common/enum';

export class CurrencyDto {
  @ApiProperty({ enum: CurrencyIdEnum, enumName: 'CurrencyIdEnum', example: CurrencyIdEnum.usd })
  id: CurrencyIdEnum;

  @ApiProperty({ enum: CurrencyEnum, enumName: 'CurrencyEnum', example: CurrencyEnum.usd })
  name: CurrencyEnum;
}
