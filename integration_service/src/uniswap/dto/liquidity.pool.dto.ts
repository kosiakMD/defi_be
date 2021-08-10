import { ApiProperty } from '@nestjs/swagger';

import { PlatformEnum } from 'src/common/enum';

export class LiquidityPoolDto {
  @ApiProperty({
    enum: PlatformEnum,
    enumName: 'PlatformEnum',
    example: PlatformEnum.uniswap,
    required: false,
  })
  name?: string;

  @ApiProperty({
    type: String,
    example: '0x975F10314CdFA9256012335719d3085435962439',
  })
  address: string;
}
