export interface TransactionsResponse {
  [address: number]: Transaction[];
}

export interface Transaction {
  chainId: number;
  hash: string;
  blockNumber: string;
  from: string;
  to: string;
  amount: amount;
  gas: gas;
  gasPrice: string;
  timeStamp: string;
}

interface amount {
  eth: number;
  usd: number;
}

interface gas {
  price: number;
  eth: number;
  usd: number;
}
