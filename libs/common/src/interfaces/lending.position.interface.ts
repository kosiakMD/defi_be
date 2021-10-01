import { LendingErcToken } from '@app/common';

export interface LendingPosition {
  address: string;
  totalDeposit?: string;
  balance: number;
  value: number;
  APY: number;
  token: LendingErcToken;
}
