export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}

export interface TransactionsResult {
  status: ResultStatus;
  error?: Error | string;
  transactions: any[];
}
