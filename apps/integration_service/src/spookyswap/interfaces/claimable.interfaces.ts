import { Address } from '@app/common';

export interface Claimable {
  user: Address;
  poolId: string;
  claimable: string;
}
