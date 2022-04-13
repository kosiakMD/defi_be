import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common';

export class ChainInfoDto {
  @ApiProperty({ enum: Object.values(ChainIdEnum).filter(Number) })
  id: ChainIdEnum = null;

  @ApiProperty({ enum: ChainAbbrEnum })
  abbr: ChainAbbrEnum = null;

  @ApiProperty({ enum: ChainNameEnum })
  name: ChainNameEnum = null;
}
