import { ERC20Token } from '../../../account_service/src/transfers/interfaces/transfers.interfaces';
import { Address } from '../common/interfaces';

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

export interface Balance {
  account: Address;
  totalUsd: number;
}

export interface BalanceToken {
  chainId: number;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
}
