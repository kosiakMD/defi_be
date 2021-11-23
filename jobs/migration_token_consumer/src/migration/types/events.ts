export interface HistoricalMigrationEvent {
  assetId: number;
  fromBlock: number;
  toBlock: number;
  chainId: number;
  template: string;
}

export interface MigrationEvent {
  chainId: number;
  userAddress: string;
  contractAddress: string;
}
