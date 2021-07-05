import { MigrationEvent } from '../types/events';
import { MigrationBlockResponse } from './migration.block.response';

export interface MigrationEventResponse {
  blocksInfoSql?: string;
  eventsSql?: string;
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
}

export interface MigrationEventServiceResponse {
  eventsResponse: MigrationEventResponse;
  blocksResponse: MigrationBlockResponse;
  migrationEvents?: MigrationEvent[];
  migrationTransactions?: MigrationTransaction[];
}

export interface LogInfo {
  address: string;
  blockHash: string;
  blockNumber: string;
  data: string;
  logIndex: string;
  removed: boolean;
  topics: string[];
  transactionHash: string;
  transactionIndex: string;
}

export interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;

  removed: boolean;

  address: string;
  data: string;

  topics: Array<string>;

  transactionHash: string;
  logIndex: number;
}

export interface LogError {
  code: number;
  message: string;
}

export interface EventsResponse {
  jsonrpc: string;
  id: number;
  result?: LogInfo[];
  error?: LogError;
}

export interface EventsBlockInfoResponse {
  result?: LogInfo[];
  lastBlock?: number;
}
