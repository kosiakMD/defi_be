import { ChainIdEnum } from '@app/common/enum';
import { ERC20Token } from '@app/common/interfaces';

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token;
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
