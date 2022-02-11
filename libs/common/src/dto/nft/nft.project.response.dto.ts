import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '@app/common';

export class NftProjectResponseDto {
  @ApiProperty({ enum: NftProjectEnum })
  project: NftProjectEnum;

  @ApiProperty({ enum: ChainAbbrEnum, isArray: true })
  chains: ChainAbbrEnum[];

  @ApiProperty({ enum: ChainIdEnum, isArray: true })
  chainsIds: ChainIdEnum[];
}
