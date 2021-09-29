// eslint-disable-next-line max-classes-per-file
import { Exclude, Expose } from 'class-transformer';

import { Address } from '@app/common';

@Exclude()
class PairDto {
  @Expose()
  id: Address;
}

@Exclude()
export class LiquidityPositionDto {
  /**
   * id is 'poolAddress-userAddress'
   *
   * e.g.
   * 0xdc9232e2df177d7a12fdff6ecbab114e2231198d-0x070d182eb7e9c3972664c959ce58c5fc6219a7ad
   */
  @Expose()
  id: string;

  @Expose()
  pair: PairDto;

  @Expose()
  liquidityTokenBalance: string;
}
