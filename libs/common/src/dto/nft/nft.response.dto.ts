import { ApiProperty } from '@nestjs/swagger';

import { ChainsDto } from '.';

export class NftResponseDto {
  @ApiProperty({
    type: ChainsDto,
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': ChainsDto;
}
