import { ChainId } from '../../common/types';

export interface EtherscanTransfer {
  blockNumber: number;
  timeStamp: number;
  hash: string;
  nonce: number;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  transactionIndex: number;
  gas: number;
  gasPrice: number;
  gasUsed: number;
  cumulativeGasUsed: number;
  input: string;
  confirmations: number;
}

export interface Token {
  chainId: ChainId;
  name: string;
  address: string;
  decimals: number;
  symbol: string;
}

export interface BalanceToken {
  amount: number;
  decimalsAmount: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
  token: Token;
}

export interface TokenBalance {
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: BalanceToken;
}

export interface Transfers {
  [key: string]: EtherscanTransfer[];
}

export interface AccountTokenBalance extends TokenBalance {
  account: string;
}

export interface AccountBalance {
  totalUsd: number;
  tokens: AccountTokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };
