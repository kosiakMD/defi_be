import { ChainIdEnum } from '@app/common/enum';

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
