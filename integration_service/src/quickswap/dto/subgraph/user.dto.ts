import { Exclude, Expose } from 'class-transformer';
import { Address } from 'src/common/types';


import { LiquidityPositionDto } from './liquidity.position.dto';

@Exclude()
export class UserDto {
  @Expose()
  id: Address;

  @Expose()
  liquidityPositions: LiquidityPositionDto[];
}
