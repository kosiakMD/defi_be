import { Address, ERC20Token } from '../common/interfaces';

export interface ApprovalProject {
  id: number;
  name: string;
  icon: string;
  description: string;
}

export interface ApprovalToken {
  id: Address;
  icon: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface ApprovalDetailed {
  chainId: number;
  allowance: string;
  blockNumber: number;
  blockTimestamp: number;
  project: ApprovalProject;
  spender: Address;
  token: ApprovalToken;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token;
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface AccountBalance {
  chainId: number;
  account: string;
  totalUsd: number;
  token: TokenBalance;
}

export type BalancesResponse = { [key: string]: AccountBalance };

export interface AllBalancesResponse {
  bscBalance: BalancesResponse;
  balance: BalancesResponse;
}
