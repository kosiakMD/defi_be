import { ProtocolTypeEnum } from 'src/common/enum';

import { BaseData, LendingErcToken } from './transactions.interfaces';

export interface LendingPosition {
  address: string;
  totalDeposit?: string;
  balance: number;
  value: number;
  APY: number;
  token: LendingErcToken;
}

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

export interface Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPosition[];
}
export interface Borrowing extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[];
}
