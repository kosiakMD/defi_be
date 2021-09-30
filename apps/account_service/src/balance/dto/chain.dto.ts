import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common';

import { Chain } from '../../price/price.interfaces';

export class ChainDto implements Chain {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({
    enum: ChainAbbrEnum,
    enumName: 'ChainAbbrEnum',
    example: ChainAbbrEnum.eth,
  })
  symbol: ChainAbbrEnum;

  @ApiProperty({
    enum: ChainNameEnum,
    enumName: 'ChainSymbolNames',
    example: ChainNameEnum.ETH,
  })
  name: ChainNameEnum;
}
