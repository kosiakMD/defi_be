import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, CurrencyEnum } from 'src/common/enum';

export class CurrencyDto {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({ enum: CurrencyEnum, enumName: 'CurrencyEnum', example: CurrencyEnum.usd })
  name: CurrencyEnum;
}
