import { Exclude, Expose } from 'class-transformer';

import { Address } from '@app/common';

import { LiquidityPositionDto } from './liquidity.position.dto';

@Exclude()
export class UserDto {
  @Expose()
  id: Address;

  @Expose()
  liquidityPositions: LiquidityPositionDto[];
}
