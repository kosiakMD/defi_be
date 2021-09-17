import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';

export class ChainDto {
  @ApiProperty({ enum: ChainIdEnum, example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({ enum: ChainNameEnum, enumName: 'ChainNameEnum', example: ChainNameEnum.eth })
  name: ChainNameEnum;

  @ApiProperty({ enum: ChainAbbrEnum, enumName: 'ChainAbbrEnum', example: ChainAbbrEnum.eth })
  abbr: ChainAbbrEnum = null;
}
