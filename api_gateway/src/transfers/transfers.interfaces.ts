export interface ERC20Token {
  address: string;
  chainId?: number;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: number;
}

export interface ERC20TokenTransfer {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: number;
  amount: {
    decimals: number;
    usd: number;
  };
}

export interface ERC20Transfer {
  fromAddress: string;
  toAddress: string;
  amount: number;
  token: ERC20Token;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
}

export interface Transfer {
  chainId: number;
  hash: string;
  blockNumber: number;
  blockTimeStamp: number;
  gasUsed: number;
  gas: {
    price: number;
    eth: number;
    usd: number;
  };
  erc20Transfers: ERC20Transfer[];
}

export interface TransfersResponse {
  [userAddress: string]: Transfer[];
}

export interface FinallyResponse {
  transfers: TransfersResponse;
  bscTransaction: TransfersResponse;
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
  tokenPrice: number;
  ethPrice: number;
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
  amount: number;
  tokenAddress: string;
  tokenPrice: number;
  ethPrice: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenTotalSupply: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
}
