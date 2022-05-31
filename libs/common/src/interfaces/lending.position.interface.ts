import { LendingErcToken } from '@app/common';

export interface LendingPosition {
  address: string;
  balance: number;
  value: number;
  APY: number;
  token: LendingErcToken;
}
