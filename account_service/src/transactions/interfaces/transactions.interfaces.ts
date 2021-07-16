import { ResultStatus } from '../../common/enum';
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
  chainId: number;
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
  type: string;
  tokenAddress?: string;
  price?: number;
}
