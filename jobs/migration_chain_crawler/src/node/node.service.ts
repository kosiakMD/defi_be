import Web3 from 'web3';

import { HttpService, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Log } from '../migrations/interfaces/migration.event.interfaces';
import { BlockTransactionObject } from '../migrations/interfaces/web3.interfaces';

export class NodeService {
  protected blockIfoTable: string;
  protected blockTable: string;
  protected web3Provider: Web3;

  constructor(
    protected httpService: HttpService,
    protected configService: ConfigService,
    protected logger: LoggerService,
  ) {}

  async getEventsDataFromNetwork(fromBlock: number, toBlock: number): Promise<Log[]> {
    const response = await this.web3Provider.eth.getPastLogs({
      fromBlock: fromBlock,
      toBlock: toBlock,
    });

    return response.length ? (response as Log[]) : [];
  }

  async getLastBlockNumberFromNetwork(): Promise<number> {
    return await this.web3Provider.eth.getBlockNumber();
  }

  async getBlocksDataFromNetwork(blockNumber: number): Promise<BlockTransactionObject> {
    const response = await this.web3Provider.eth.getBlock(blockNumber, true);
    return response || null;
  }

  getBlockIfoTable(): string {
    return this.blockIfoTable;
  }

  getBlockTable(): string {
    return this.blockTable;
  }
}
