import { ResultStatus } from '@app/common/enum';

import { TransactionsDto } from './dto/transactions.dto';

interface IAmount {
  eth: number;
  usd: number;
}

interface IGasSimple {
  price: number;
  eth: number;
  usd: number;
}

export interface Transaction {
  chainId: number;
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  amount: IAmount;
  gas: IGasSimple;
  blockTimestamp: string;
}

export interface TransactionsResponse {
  [address: string]: Transaction[];
}

export interface TransactionsResult {
  status: ResultStatus;
  errors?: Error | string;
  data: TransactionsDto[];
}

export interface SubTransaction {
  address: string;
  amount: string;
  symbol: string;
  decimals: number;
  from?: string;
  to?: string;
  type: string;
  tokenAddress?: string;
  price?: number;
}

export interface TransactionCovalent {
  chainId: number;
  blockNumber: number;
  blockHash: string;
  hash: string;
  timeStamp: string;
  value: string;
  valueInCurrency: number;
  currency: string;
  gasPrice: number;
  gasUsed: number;
  isError: string;
}
