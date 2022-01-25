import { Address } from '@app/common';

export interface ConvexPoolInfo {
  lptoken: Address; //
  token: Address; //
  gauge: Address; // deposited gauge/farm/stake
  crvRewards: Address; // reward pool
  stash: Address; // if a gauge claims on deposit, its stored here until the next 'claim' action
  shutdown: boolean;
}
