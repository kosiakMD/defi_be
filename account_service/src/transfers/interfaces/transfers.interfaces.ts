export interface ERC20Token {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: number;
}

export interface ERC20Transfer {
  fromAddress: string;
  toAddress: string;
  amount: number;
  token: ERC20Token;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  logIndex?: number;
}

export interface Transaction {
  hash: string;
  blockNumber: number;
  blockTimeStamp: number;
  gasUsed: number;
  gasPrice: number;
  gasUsedEther: number;
  gasUsedUSD: number;
  erc20Transfers: ERC20Transfer[];
}

export interface TransactionsResponse {
  [userAddress: string]: Transaction[];
}

export interface FinallyResponse {
  transfers: TransactionsResponse;
  bscTransaction: TransactionsResponse;
}

export interface TransactionWithToken {
  hash: string;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: number;
  gasUsed: number;
  gasPrice: number;
  amount: number;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenTotalSupply: number;
}

export interface TransactionWithTokenAndPrices {
  hash: string;
  blockNumber: number;
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: number;
  gasUsed: number;
  gasPrice: number;
  gasPriceUSD: number;
  amount: number;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenTotalSupply: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
}
