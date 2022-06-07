import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common';

export class ChainDto {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  @Type(() => Number)
  id: ChainIdEnum;

  @ApiProperty({ enum: ChainNameEnum, enumName: 'ChainNameEnum', example: ChainNameEnum.eth })
  name: ChainNameEnum;

  @ApiProperty({
    enum: ChainAbbrEnum,
    enumName: 'ChainAbbrEnum',
    example: ChainAbbrEnum.eth,
    description: 'chain abbreviation/acronym',
  })
  abbr: ChainAbbrEnum;

  constructor(transaction: Partial<ChainDto>) {
    Object.assign(this, transaction);
  }
}
