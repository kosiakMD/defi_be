import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';

import { Chain } from '../../price/price.interfaces';

export class ChainDto implements Chain {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @Type(() => Number)
  id: ChainIdEnum = null;

  @ApiProperty({
    enum: ChainAbbrEnum,
    enumName: 'ChainAbbrEnum',
    example: ChainAbbrEnum.eth,
  })
  symbol: ChainAbbrEnum = null;

  @ApiProperty({
    enum: ChainNameEnum,
    enumName: 'ChainSymbolNames',
    example: ChainNameEnum.ETH,
  })
  name: ChainNameEnum = null;
}
