import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum, ChainNameEnum } from 'src/common/enum';

export class ChainDto {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  id: ChainIdEnum;

  @ApiProperty({ enum: ChainNameEnum, enumName: 'ChainNameEnum', example: ChainNameEnum.eth })
  name: ChainNameEnum;
}
