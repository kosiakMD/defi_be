import { LendingErcToken } from '@app/common/dto/lending-erc-token.dto';

export interface BorrowingPosition {
  address: string;
  totalDebt: string;
  stableDebt: string;
  variableDebt: string;
  totalDebtDecimal: number;
  stableDebtDecimal: number;
  variableDebtDecimal: number;
  totalDebtUSD: number;
  stableDebtUSD: number;
  variableDebtUSD: number;
  borrowStableAPY: number;
  borrowVariableAPY: number;
  token: LendingErcToken;
}
