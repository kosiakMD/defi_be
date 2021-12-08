import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common';

import { Chain } from '../interfaces';

export class ChainDto implements Chain {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({
    enum: ChainAbbrEnum,
  })
  symbol: ChainAbbrEnum;

  @ApiProperty({
    enum: ChainNameEnum,
  })
  name: ChainNameEnum;
}
