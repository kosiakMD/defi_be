import { ChainIdEnum } from 'src/common/enum';
import { ERC20Token } from 'src/common/interfaces';

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
  totalUsd: number;
}

export interface BalanceToken {
  chainId: ChainIdEnum;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
  isLp?: boolean;
}
