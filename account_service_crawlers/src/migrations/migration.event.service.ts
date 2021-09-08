import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { getManager, Repository } from 'typeorm';
import Web3 from 'web3';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { NodeService } from '../node/node.service';
import {
  BSC_LAST_BLOCKS,
  BSC_NETWORK,
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  ETH_BSC_MIGRATION_STEP,
  ETH_LAST_BLOCKS,
  ETH_NETWORK,
} from '../utils/utils';
import { AssetsService } from './assets.service';
import { AssetsEntity } from './entities/assets.entity';
import {
  Log,
  MigrationEventResponse,
  MigrationEventServiceResponse,
  MigrationTransaction,
} from './interfaces/migration.event.interfaces';
import { BlockTransactionObject } from './interfaces/web3.interfaces';
import { emptyResult, range, successfulResult } from './migration.utils';
import { SqlService } from './sql.service';
import { MigrationEvent } from './types/events';

@Injectable()
export class MigrationEventService {
  private readonly ethBlockStep: number;
  private readonly bscBlockStep: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AssetsEntity)
    private assetsRepository: Repository<AssetsEntity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private sqlService: SqlService,
    private assetsService: AssetsService,
  ) {
    this.ethBlockStep = configService.get('ETH_BLOCKS_MIGRATION_STEP');
    this.bscBlockStep = configService.get('BSC_BLOCKS_MIGRATION_STEP');
  }

  private getEventsAndBlockInfoSqlStrings(
    logsArray: Log[],
    nodeService: NodeService,
    fromHex: string,
    toHex: string,
  ): MigrationEventResponse {
    const blocksInfoSql = logsArray.length
      ? this.sqlService.getBlockInfoSqlString(
          fromHex,
          toHex,
          successfulResult,
          nodeService.getBlockIfoTable(),
          logsArray.length,
        )
      : this.sqlService.getBlockInfoSqlString(
          fromHex,
          toHex,
          emptyResult,
          nodeService.getBlockIfoTable(),
        );

    return { blocksInfoSql };
  }

  private getEventsPromisesArray(
    nodeService: NodeService,
    fromBlock: number,
    toBlock: number,
  ): Promise<Log[]>[] {
    const loopCount: number = Math.ceil((toBlock - (fromBlock - 1)) / ETH_BSC_MIGRATION_STEP);

    const array = loopCount === 0 ? [1] : range(1, loopCount, 1);
    let firstElement: number = fromBlock;

    return array.map(() => {
      const toNum =
        firstElement + ETH_BSC_MIGRATION_STEP - 1 > toBlock
          ? toBlock
          : firstElement + ETH_BSC_MIGRATION_STEP - 1;
      const promise = nodeService.getEventsDataFromNetwork(firstElement, toNum);
      firstElement =
        firstElement + ETH_BSC_MIGRATION_STEP > toBlock
          ? toBlock
          : firstElement + ETH_BSC_MIGRATION_STEP;
      return promise;
    });
  }

  private async getBlocksAndTransactionFromNetwork(
    start: number,
    finish: number,
    nodeService: NodeService,
  ): Promise<BlockTransactionObject[]> {
    this.logger.log(`Get block data ${start} - ${finish}`);
    const array = range(start, finish, 1);

    const promisesEthBlocks = array.map((block) => nodeService.getBlocksDataFromNetwork(block));

    return await Promise.all(promisesEthBlocks);
  }

  private async getFromBlockAndToBlockValues(
    nodeService: NodeService,
    network: string,
  ): Promise<{ fromBlock: number; toBlock: number }> {
    const dbEventLastBlock = await getManager().query(
      this.sqlService.getBlockInfoSelectString(nodeService.getBlockIfoTable()),
    );
    const networkLastBlock = await nodeService.getLastBlockNumberFromNetwork();

    const actualNetworkLastBlockNum =
      network === BSC_NETWORK
        ? networkLastBlock - BSC_LAST_BLOCKS
        : networkLastBlock - ETH_LAST_BLOCKS;

    if (dbEventLastBlock.length && actualNetworkLastBlockNum === +dbEventLastBlock[0].to_block) {
      this.logger.warn(
        `${network.toUpperCase()} - Last block in DB is the same with EthLastBlock!!!`,
      );
      throw Error('Db and network are synchronized!!!');
    }

    const fromBlock =
      dbEventLastBlock && dbEventLastBlock.length ? +dbEventLastBlock[0].to_block + 1 : 0;
    const step = network === BSC_NETWORK ? this.bscBlockStep : this.ethBlockStep;
    const toBlock = fromBlock + step;

    if (toBlock > actualNetworkLastBlockNum) {
      this.logger.log(
        `${network.toUpperCase()} - Last block with Logs: ${actualNetworkLastBlockNum}`,
      );
      return { fromBlock, toBlock: actualNetworkLastBlockNum };
    }
    this.logger.log(`${network.toUpperCase()} - toBlock number = ${toBlock}`);
    return { fromBlock, toBlock };
  }

  async getDataFromNetworkWithBlocksNum(
    nodeService: NodeService,
    network: string,
    fromBlock: number,
    toBlock: number,
  ): Promise<MigrationEventServiceResponse> {
    const fromHex: string = Web3.utils.fromDecimal(fromBlock);
    const toHex: string = Web3.utils.fromDecimal(toBlock);
    const eventsPromiseArray = this.getEventsPromisesArray(nodeService, fromBlock, toBlock);
    const eventsResults = await Promise.all(eventsPromiseArray);
    const logsArray: Log[] = eventsResults.flat();
    const chainId = network === ETH_NETWORK ? CHAIN_ID_ETH : CHAIN_ID_BSC;

    const blockTransactionObjects: BlockTransactionObject[] =
      await this.getBlocksAndTransactionFromNetwork(fromBlock, toBlock, nodeService);
    const migrationTransactions: MigrationTransaction[] = this.getMigrationTransactions(
      blockTransactionObjects,
      chainId,
    );
    const migrationEvents: MigrationEvent[] = await this.assetsService.getAssetEventsArray(
      logsArray,
      blockTransactionObjects,
      chainId,
    );

    this.logger.log(`${network.toUpperCase()} -- Events array length = ${logsArray.length}`);

    const { blocksInsertSql, transactionsInsertSql } =
      this.sqlService.getBlocksAndTransactionsSqlStrings(
        blockTransactionObjects,
        nodeService.getBlockTable(),
      );

    const { blocksInfoSql, eventsSql } = this.getEventsAndBlockInfoSqlStrings(
      logsArray,
      nodeService,
      fromHex,
      toHex,
    );

    return {
      eventsResponse: { blocksInfoSql, eventsSql },
      blocksResponse: { transactionsInsertSql, blocksInsertSql },
      migrationEvents: migrationEvents,
      migrationTransactions: migrationTransactions,
    };
  }

  async getSqlStringsForDataFromNetwork(
    nodeService: NodeService,
    network: string,
  ): Promise<MigrationEventServiceResponse> {
    const { fromBlock, toBlock } = await this.getFromBlockAndToBlockValues(nodeService, network);
    return await this.getDataFromNetworkWithBlocksNum(nodeService, network, fromBlock, toBlock);
  }

  private getMigrationTransactions(
    blocks: BlockTransactionObject[],
    chainId: number,
  ): MigrationTransaction[] {
    const result: MigrationTransaction[] = [];
    blocks.forEach((block) => {
      block.transactions.forEach((transaction) => {
        result.push({
          hash: transaction.hash,
          blockNumber: block.number,
          from: transaction.from,
          to: transaction.to,
          input: transaction.input,
          value: transaction.value,
          gas: transaction.gas,
          gasPrice: transaction.gasPrice,
          index: String(transaction.transactionIndex),
          timestamp: String(block.timestamp),
          chainId: chainId,
        });
      });
    });
    return result;
  }
}
