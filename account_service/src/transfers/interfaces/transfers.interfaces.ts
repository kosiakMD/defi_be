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
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
}

export interface ERC20Transfer {
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: ERC20Token;
  tokenPriceUSD: number;
  totalPriceUSD: number;
}

export interface ScanTransfer {
  chainId: number;
  hash: string;
  blockNumber: number;
  blockTimeStamp: number;
  gas: number;
  gasPrice: number;
  gasUsed: number;
  erc20Transfers: ERC20Transfer[];
}

export interface Transfer {
  chainId: number;
  hash: string;
  blockTimeStamp: string;
  // TODO: until no gas in DB
  // gas?: number;
  // gasPrice?: number;
  // gasUsed: string;
  erc20Transfers: ERC20Transfer[];
}

export interface TransfersResponse<T = Transfer | ScanTransfer> {
  [userAddress: string]: T[];
}

export interface FinallyResponse {
  transfers: TransfersResponse;
  bscTransaction: TransfersResponse;
}

export interface TransactionWithToken {
  hash: string;
  // blockNumber?: number;
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: string;
  // gas?: number;
  // gasUsed?: number;
  // gasPrice?: number;
  amount?: string;
  tokenAddress?: string;
  // tokenPrice?: number; //
  // ethPrice?: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  // tokenTotalSupply?: number;
}

export interface TransferWithTokenAndPrices {
  hash: string;
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: string;
  blockNumber?: number; //
  gas?: number; //
  gasPrice?: number; //
  gasUsed?: number;
  amount?: string;
  tokenAddress?: string;
  tokenPrice?: number;
  ethPrice?: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenTotalSupply?: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
}

export interface TransferRawFromDb {
  id: number;
  // eslint-disable-next-line camelcase
  tx_hash: string;
  from: string;
  to: string;
  timestamp: string;
  value: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TransferFromDb {
  id: number;
  hash: string;
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: string;
  amount: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
}
