import { ChainIdEnum, ResultStatus } from '@app/common/enum';

import { TransactionDto } from '../dto/transaction.dto';

interface amount {
  eth: number;
  usd: number;
}

interface gas {
  price: number;
  eth: number;
  usd: number;
}

export interface Transaction {
  chainId: ChainIdEnum;
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  amount: amount;
  gas: gas;
  blockTimestamp: string;
}

export interface TransactionsResponse {
  [address: string]: Transaction[];
}

export interface TransactionsResult {
  status: ResultStatus;
  errors?: Error | string;
  data: TransactionDto[];
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
  chainId: ChainIdEnum;
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
