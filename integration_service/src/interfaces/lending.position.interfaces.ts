import { ProtocolTypeEnum } from 'src/common/enum';

import { BaseData, LendTokenDto } from './transactions.interfaces';

export interface LendingPosition {
  address: string;
  totalDeposit: string;
  totalDepositDecimal: number;
  totalDepositUSD: number;
  lendingAPY: number;
  token: LendTokenDto;
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
  token: LendTokenDto;
}

export interface Lending extends BaseData<ProtocolTypeEnum.lending> {
  lendingPositions: LendingPosition[];
}
export interface Borrowing extends BaseData<ProtocolTypeEnum.borrowing> {
  borrowingPositions: BorrowingPosition[];
}
