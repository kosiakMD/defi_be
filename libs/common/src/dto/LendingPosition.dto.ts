import { LendingToken } from './LendingToken.dto';

export class LendingPosition {
  address: string;
  totalDeposit: string;
  totalDepositDecimal: number;
  totalDepositUSD: number;
  lendingAPY: number;
  token: LendingToken;
}
