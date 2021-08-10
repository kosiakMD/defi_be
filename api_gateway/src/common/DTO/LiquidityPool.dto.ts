import { ApiProperty } from '@nestjs/swagger';

import { PlatformEnum } from '../enum';
import { Address, LiquidityPool } from '../interfaces';

export class LiquidityPoolDto implements LiquidityPool {
  @ApiProperty({ type: String, example: '0xa57bd00134b2850b2a1c55860c9e9ea100fdd6cf' })
  address: Address;

  @ApiProperty({
    enum: PlatformEnum,
    enumName: 'PlatformEnum',
    example: PlatformEnum.uniswap,
    required: false,
  })
  name?: string;
}
