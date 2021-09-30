import { ApiProperty } from '@nestjs/swagger';

import { ProjectEnum } from '@app/common/enum';

export class LiquidityPoolDto {
  @ApiProperty({
    enum: ProjectEnum,
    enumName: 'ProjectEnum',
    example: ProjectEnum.uniswap,
    required: false,
  })
  name?: string;

  @ApiProperty({
    type: String,
    example: '0x975F10314CdFA9256012335719d3085435962439',
  })
  address: string;
}
