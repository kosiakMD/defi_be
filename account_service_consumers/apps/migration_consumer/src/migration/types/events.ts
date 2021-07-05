export interface HistoricalMigrationEvent {
  assetId: number;
  fromBlock: number;
  toBlock: number;
  chainId: number;
  template: string;
}

export interface MigrationEvent {
  chainId: number;
  transactionHash: string;
  address: string;
  topic1: string;
  topic2?: string;
  topic3?: string;
  topics: string;
  data: string;
  blockNumber: number;
  blockTimestamp: number;
  logIndex: number;
}
