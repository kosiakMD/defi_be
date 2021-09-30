import { Address } from 'src/common/types';

export interface Claimable {
  user: Address;
  poolId: string;
  claimable: string;
}
