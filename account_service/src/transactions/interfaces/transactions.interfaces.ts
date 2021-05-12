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

export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}

export interface TransactionsResult {
  status: ResultStatus;
  error?: Error | string;
  transactions: any[];
}
