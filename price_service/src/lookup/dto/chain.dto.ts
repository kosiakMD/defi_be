import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ChainNameEnum, ChainAbbrEnum } from '../../common/enum';

export class ChainDto {
  @ApiProperty({ enum: ChainIdEnum, example: ChainIdEnum.eth })
  id: ChainIdEnum = null;

  @ApiProperty({ enum: ChainNameEnum, enumName: 'ChainNameEnum', example: ChainNameEnum.eth })
  name: ChainNameEnum = null;

  @ApiProperty({ enum: ChainAbbrEnum, enumName: 'ChainAbbrEnum', example: ChainAbbrEnum.eth })
  abbr: ChainAbbrEnum = null;
}
