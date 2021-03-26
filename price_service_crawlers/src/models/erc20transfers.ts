import { ERC20Token } from './common';

export interface TransactionsResponse {
  [userAddress: string]: Transaction[];
}

export interface Transaction {
  hash: String;
  blockNumber: number;
  blockTimeStamp: number;
  gas: string;
  gasPrice: string;
  gasUsedEther: string;
  erc20Transfers: ERC20Transfer[]
}

export interface ERC20Transfer {
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: ERC20Token
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  logIndex?: number;
}
