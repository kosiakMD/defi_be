import { MigrationBlockResponse } from './migration.block.response';
import { MigrationEvent } from '../types/events';

export interface MigrationEventResponse {
  blocksInfoSql?: string;
  eventsSql?: string;
}

export interface MigrationEventServiceResponse {
  eventsResponse: MigrationEventResponse;
  blocksResponse: MigrationBlockResponse;
  migrationEvents?: MigrationEvent[];
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
