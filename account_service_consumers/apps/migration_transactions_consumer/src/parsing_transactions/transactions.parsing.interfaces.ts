export interface SubTransactions {
  address: string;
  amount: string;
  symbol: string;
  type: string;
  tokenAddress?: string;
  price?: number;
  gasUsed?: number;
  gasUsedUsd?: number;
}

export interface ParsedTransfers {
  address?: string;
  gas: number;
  gasPrice: string;
  hash: string;
  name: string;
  subTransactions?: SubTransactions[];
}

export interface MigrationEvent {
  transactionHash: string;
  address?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  topics?: string;
  data?: string;
  blockNumber: number;
  blockTimestamp: number;
  chainId?: number;
  logIndex?: number;
  assetId?: number;
  template?: string;
}

export interface MigrationTransaction {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  input: string;
  value: string;
  gas: number;
  gasPrice: string;
  index: string;
  timestamp: string;
  events?: MigrationEvent[];
  gasUsed?: number;
  gasUsedUsd?: number;
}
