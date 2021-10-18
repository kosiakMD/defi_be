import { ApiProperty } from '@nestjs/swagger';

import { AssetDto } from '.';

export class AssetsResponseDto {
  @ApiProperty({
    type: [AssetDto],
  })
  '0x64850F38e800E04eF773efca8FCaFdceFe977f9D': AssetDto[];
}
