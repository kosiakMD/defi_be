import { ApiProperty } from '@nestjs/swagger';

import { Address } from '../types';
import { ProjectEnum } from '../enum';
import { LiquidityPositionPool } from '../interfaces';

export class LiquidityPoolDto implements LiquidityPositionPool {
  @ApiProperty({ type: String, example: '0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf' })
  address: Address;

  @ApiProperty({
    enum: ProjectEnum,
    enumName: 'ProjectEnum',
    example: ProjectEnum.uniswap,
    required: false,
  })
  name?: string;
}
