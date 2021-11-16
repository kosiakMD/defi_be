import { ApiProperty } from '@nestjs/swagger';

import { NftChainDto } from '.';

export class NftResponseDto {
  @ApiProperty({
    type: [NftChainDto],
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': NftChainDto[];
}
