import { Address } from '../types';
import { ERC20Token } from './index';

export interface BalanceToken {
  chainId?: number;
  decimals: number;
  symbol: string;
  name: string;
  address: string;
  isLp?: boolean;
}

export interface TokenRow {
  address: string;
  amount: string;
  tokenAddress: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimals?: string;
  tokenTotalSupply?: string;
  isLp?: boolean;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: ERC20Token | BalanceToken;
}

export interface DbTokenPrice {
  address: string;
  price: number;
}

export interface Web3TokenBalance {
  account: string;
  amount: string;
}

export interface TokenPriceInterface {
  address: string;
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface ErrorMessage {
  chainId: number;
  statusCode: number;
  message: string;
}

export interface AccountBalance {
  account: Address;
  totalUsd: number;
  tokens: AccountTokenBalance[];
  errors?: ErrorMessage[];
}

// export interface AccountBalance {
//   chainId: ChainIdEnum;
//   account: Address;
//   totalUsd: number;
//   token: TokenBalance;
//   errors?: ErrorMessage[];
// }

export interface EthTokenBalance {
  [key: string]: BalanceToken;
}
