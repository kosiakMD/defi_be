import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, ChainNameEnum } from '@app/common/enum';

export class ChainDto {
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
