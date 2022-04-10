import { LendingErcToken } from '../dto';

export interface LendingPosition {
  address: string;
  balance: number;
  value: number;
  APY: number;
  token: LendingErcToken;
}
