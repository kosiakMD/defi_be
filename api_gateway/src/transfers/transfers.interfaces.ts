export interface ERC20Token {
  address: string;
  chainId?: number;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: number;
}

export interface ERC20Transfer {
  fromAddress: string;
  toAddress: string;
  amount: string; // number!!!
  token: ERC20Token;
  tokenPriceUSD: number;
  totalPriceUSD: number;
}

export interface Transfer {
  chainId: number;
  hash: string;
  blockTimeStamp: number;
  // gas: number;
  // gasPrice: number;
  // gasUsed: number;
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
  blockNumber: string; // number
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: string; // number
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

export interface EtherscanTransfer {
  blockNumber: string; // number
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

export interface TransactionWithTokenAndPrices extends EtherscanTransfer {
  hash: string;
  blockNumber: string; // number
  fromAddress: string;
  toAddress: string;
  blockTimeStamp: string; // number
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

export interface ERC20TokenTransfer {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: number;
}
