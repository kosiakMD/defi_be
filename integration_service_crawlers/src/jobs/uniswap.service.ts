import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { UniswapSubgraph } from '../thegraph/uniswap/uniswap.subgraph';
import { DatabaseManagerUniswap } from './db/database.manager.uniswap';
import { DatabaseTransactionManager } from './db/database.transaction.manager';

@Injectable()
export class UniswapService {
  protected integrationName = 'uniswap';
  constructor(
    protected configService: ConfigService,
    protected databaseManager: DatabaseManagerUniswap,
    protected subgraph: UniswapSubgraph,
    protected dbTransactionManager: DatabaseTransactionManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  public async startMigration(): Promise<any> {
    try {
      const blockNumbersToMigrate = await this.buildBlockNumberArray();
      return await this.handleConcurrently(blockNumbersToMigrate);
    } catch (e) {
      this.logger.error(e, 'UniswapService');
      this.logger.log(`${this.integrationName} import failed`, 'UniswapService');
      return 'import failed';
    }
  }

  private async buildBlockNumberArray(): Promise<Array<number>> {
    let migrationStartBlock: number = await this.databaseManager.getLastDatabaseBlock();

    // if last block not found, get it from the subgraph, in other way need toad one to db block
    if (migrationStartBlock === null) {
      const firstTransactionInSubgraph = await this.subgraph.getBlock('asc');
      migrationStartBlock = Number(firstTransactionInSubgraph.data.transactions[0].blockNumber);
      this.logger.log(
        `starting initial [${this.integrationName}] data migration from block [${migrationStartBlock}]`,
      );
    } else {
      migrationStartBlock++;
    }

    const lastTransactionInSubgraph = await this.subgraph.getBlock('desc');
    const migrationEndBlock = lastTransactionInSubgraph.data.transactions[0].blockNumber;

    this.logger.log(
      `starting [${
        this.integrationName
      }] data migration from [${migrationStartBlock}] to [${migrationEndBlock}], blocks count: [${
        migrationEndBlock - migrationStartBlock
      }]`,
    );

    const blockNumbers = [];
    for (let i = migrationStartBlock; i <= migrationEndBlock; i++) {
      blockNumbers.push(i);
    }
    return blockNumbers;
  }

  protected async handleConcurrently(blockNumbers: Array<number>): Promise<string> {
    let chunksArray: Array<number>;
    const chunkSize = parseInt(this.configService.get<string>('CONCURRENCY_PROMISES_LIMIT'));

    for (let i = 0, j = blockNumbers.length; i < j; i += chunkSize) {
      chunksArray = blockNumbers.slice(i, i + chunkSize);
      await this.dbTransactionManager.begin();
      try {
        await Promise.all(chunksArray.map((number) => this.migrateBlockData(number)));
      } catch (e) {
        this.logger.error(e, 'UniswapService');
        this.logger.log(
          `error during processing ${this.integrationName} blocks from [${chunksArray[0]}] to [${
            chunksArray[chunksArray.length - 1]
          }]`,
          'UniswapService',
        );
        await this.dbTransactionManager.rollback();
        return blockNumbers.length.toString().concat(' imported with error');
      }
      this.logger.log(
        `blocks processing done ${this.integrationName} blocks from [${chunksArray[0]}] to [${
          chunksArray[chunksArray.length - 1]
        }] count [${chunksArray[chunksArray.length - 1] - chunksArray[0] + 1}]`,
        'UniswapService',
      );
      await this.dbTransactionManager.commit();
    }
    return blockNumbers.length.toString().concat(' imported');
  }

  protected async migrateBlockData(number: number): Promise<any> {
    const [transactions, snapshots] = await Promise.all([
      this.subgraph.getTransactionsByBlockNumber(Number(number)),
      this.subgraph.getShapshotsByBlockNumber(Number(number)),
    ]);

    const [
      uniswapMintsSqlValues,
      uniswapBurnsSqlValues,
      uniswapSwapsSqlValues,
      uniswapSnapshotsSqlValues,
    ] = [
      DatabaseManagerUniswap.getSqlValuesToInsert(transactions.data.transactions, 'mints'),
      DatabaseManagerUniswap.getSqlValuesToInsert(transactions.data.transactions, 'burns'),
      DatabaseManagerUniswap.getSqlValuesToInsert(transactions.data.transactions, 'swaps'),
      DatabaseManagerUniswap.getSqlSnapshotsValuesToInsert(snapshots.data.snapshots),
    ];

    await Promise.all([
      this.databaseManager.insertTransactionValues(uniswapMintsSqlValues, 'mints'),
      this.databaseManager.insertTransactionValues(uniswapBurnsSqlValues, 'burns'),
      this.databaseManager.insertTransactionValues(uniswapSwapsSqlValues, 'swaps'),
      this.databaseManager.insertTransactionValues(uniswapSnapshotsSqlValues, 'snapshots'),
    ]);
  }
}
