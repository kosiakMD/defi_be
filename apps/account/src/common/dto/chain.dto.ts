import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainNameEnum } from '@app/common';

import { Chain } from '../interfaces';

export class ChainDto implements Chain {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    enum: ChainAbbrEnum,
  })
  symbol: ChainAbbrEnum;

  @ApiProperty({
    enum: ChainNameEnum,
  })
  name: ChainNameEnum;
}
