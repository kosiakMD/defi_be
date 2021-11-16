import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, NftProjectEnum } from '@app/common';

export class NftProjectResponseDto {
  @ApiProperty({ enum: NftProjectEnum })
  project: NftProjectEnum;

  @ApiProperty({ enum: ChainAbbrEnum, isArray: true })
  chains: ChainAbbrEnum[];
}
