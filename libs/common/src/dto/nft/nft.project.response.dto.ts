import { ApiProperty } from '@nestjs/swagger';

import { ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '../../enum';

export class NftProjectResponseDto {
  @ApiProperty({ enum: NftProjectEnum })
  project: NftProjectEnum = null;

  @ApiProperty({ enum: ChainAbbrEnum, isArray: true })
  chains: ChainAbbrEnum[] = null;

  @ApiProperty({ enum: ChainIdEnum, isArray: true })
  chainsIds: ChainIdEnum[] = null;
}
