import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import pLimit from 'p-limit';

import { DatabaseService } from './db/database.service';
import { TheGraphQuery } from './interfaces/graph.interface';

axiosRetry(axios, {
  retries: 1e9,
  retryCondition: () => true,
  shouldResetTimeout: true,
  retryDelay: axiosRetry.exponentialDelay,
});

@Injectable()
export class CurveService {
  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}

  public async startJob(): Promise<void> {
    const databaseClient = await this.databaseService.getClient();

    const blockNumbers = await this.getBlocksToLoad(databaseClient);

    if (!blockNumbers) return;

    await this.promiseAllInsertFunctions(blockNumbers, databaseClient);
  }

  private async promiseAllInsertFunctions(blockNumbers, databaseClient): Promise<any> {
    const limit = pLimit(parseInt(this.configService.get<string>('CONCURRENCY_PROMISES_LIMIT')));

    return Promise.all([
      blockNumbers.map((number) =>
        limit(() => this.loadTransactionsAndSnapshots(number, databaseClient)),
      ),
    ]);
  }

  private async loadTransactionsAndSnapshots(number: number, databaseClient: any): Promise<void> {
    const transactions = await this.getTransactionsByNumber(number);

    const {
      mintsSqlValues,
      burnsSqlValues,
      burnsOneSqlValues,
      stakesSqlValues,
      unStakesSqlValues,
    } = this.formatAllTransactions(transactions);

    const promisesPool = [];

    if (mintsSqlValues) {
      const mintsInsertQuery = CurveService.getSeparatedByUserSqlQueryString(
        mintsSqlValues,
        'curve_mints',
      );
      promisesPool.push(databaseClient.query(mintsInsertQuery));
    }
    if (burnsSqlValues) {
      const burnsInsertQuery = CurveService.getSeparatedByUserSqlQueryString(
        burnsSqlValues,
        'curve_burns',
      );
      promisesPool.push(databaseClient.query(burnsInsertQuery));
    }
    if (burnsOneSqlValues) {
      const swapsInsertQuery = CurveService.getSeparatedByUserSqlQueryString(
        burnsOneSqlValues,
        'curve_burns_one',
      );
      promisesPool.push(databaseClient.query(swapsInsertQuery));
    }
    if (stakesSqlValues) {
      const snapshotsInsertQuery = CurveService.getSeparatedByFromSqlQueryString(
        stakesSqlValues,
        'curve_stakes',
      );
      promisesPool.push(databaseClient.query(snapshotsInsertQuery));
    }
    if (unStakesSqlValues) {
      const snapshotsInsertQuery = CurveService.getSeparatedByToSqlQueryString(
        unStakesSqlValues,
        'curve_unStakes',
      );
      promisesPool.push(databaseClient.query(snapshotsInsertQuery));
    }

    if (promisesPool.length) await Promise.all(promisesPool);
  }

  private static getSeparatedByUserSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (user_address, information, block_number, created_at)
						VALUES ${values}`;
  }

  private static getSeparatedByFromSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (from_address, information, block_number, created_at)
						VALUES ${values}`;
  }

  private static getSeparatedByToSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (to_address, information, block_number, created_at)
						VALUES ${values}`;
  }

  private formatAllTransactions(transactions: any[]): Record<string, string> {
    this.logger.log(`formatAllTransactions ${transactions.length}`);
    return {
      mintsSqlValues: this.getSeparatedBySqlStringValues(transactions, 'mints', 'user'),
      burnsSqlValues: this.getSeparatedBySqlStringValues(transactions, 'burns', 'user'),
      burnsOneSqlValues: this.getSeparatedBySqlStringValues(transactions, 'burnsOne', 'user'),
      stakesSqlValues: this.getSeparatedBySqlStringValues(transactions, 'stakes', 'from'),
      unStakesSqlValues: this.getSeparatedBySqlStringValues(transactions, 'unStakes', 'to'),
    };
  }

  private async getTransactionsByNumber(blockNumber: number): Promise<any> {
    this.logger.log(`getTransactionsByNumber ${blockNumber}`);
    return (
      await axios.post(
        this.configService.get<string>('CURVE_REQUEST_URL'),
        CurveService.getTransactionsQuery(blockNumber),
      )
    ).data.data?.transactions;
  }

  private getSeparatedBySqlStringValues(
    transactions: any[],
    transactionField: string,
    elementField: string,
  ): string {
    this.logger.log(
      `getSeparatedBySqlStringValues transactionField: ${transactionField}, elementField: ${elementField}`,
    );

    return transactions
      .filter((transaction) => !!transaction?.[transactionField].length)
      .map((transaction) => {
        return transaction[transactionField]
          .map(
            (element) =>
              `('${element[elementField]}','${JSON.stringify(element)}', ${parseInt(
                element.transaction.block,
              )}, to_timestamp(${parseInt(element.transaction.timestamp)}))`,
          )
          .join(',');
      })
      .join(',');
  }

  private static getTransactionsQuery(blockNumber: number): TheGraphQuery {
    return {
      operationName: 'Transactions',
      variables: {
        blockNumber: blockNumber,
      },
      query: `query transactions($blockNumber: Int!) {
				transactions (first: 1000 block:{number: $blockNumber} where: {block: $blockNumber}) {
					mints {
            user
            transaction {
              id
              block
              timestamp
            }
            pool {
              id
            }
            tokenAmounts
            invariant
            mintedSupply
          }
          burnsOne {
            user
            transaction {
             id
             block
             timestamp
            }
            pool {
             id
            }
            lpTokenAmount
            swapTokenAmount
          }
          burns {
            user
            transaction {
              id
              block
              timestamp
            }
            pool {
              id
            } 
            tokenAmounts
            burnedSupply
          }
          stakes: lpTransfers {
            transaction {
             id
             block
             timestamp
           }
           token {
             id
           }
           from
           value
           virtualPrice
          }
          unStakes: lpTransfers {
           transaction {
             id
             block
             timestamp
           }
           token {
             id
           }
           to
           value
           virtualPrice
          }
				}
			}`,
    };
  }

  private async getBlocksToLoad(databaseClient): Promise<Array<number> | false> {
    this.logger.log(`getBlocksToLoad`);
    const [lastBlockFromDB, lastBlock] = await Promise.all([
      (await databaseClient.query(CurveService.queryToGetLastBlock())).rows[0]?.last_block,
      await this.getLastBlockNumber(),
    ]);
    this.logger.log(`lastBlockFromDB ${lastBlockFromDB}`);
    this.logger.log(`lastBlock ${lastBlock}`);

    if (lastBlockFromDB == lastBlock) {
      this.logger.log(`lastBlockFromDB == lastBlock`);
      return false;
    }

    if (lastBlockFromDB) {
      const result = CurveService.createArrayOfBlockNumbers(
        parseInt(lastBlockFromDB) + 1,
        parseInt(lastBlock),
      );
      this.logger.log(`createArrayOfBlockNumbers ${result}`);
      return result;
    }

    const firstBlock = await this.getFirstBlockNumber();
    this.logger.log(`firstBlock ${firstBlock}`);
    const result = CurveService.createArrayOfBlockNumbers(
      parseInt(firstBlock),
      parseInt(lastBlock),
    );
    this.logger.log(`createArrayOfBlockNumbers ${result}`);
    return result;
  }

  // eslint-disable
  private static queryToGetLastBlock(): string {
    return `
        SELECT block_number AS last_block
        FROM (SELECT block_number
              FROM curve_burns
              WHERE block_number = (SELECT MAX(block_number) FROM curve_burns)
              UNION
              SELECT block_number
              FROM curve_mints
              WHERE block_number = (SELECT MAX(block_number) FROM curve_mints)
              UNION
              SELECT block_number
              FROM curve_burns_one
              WHERE block_number = (SELECT MAX(block_number) FROM curve_burns_one)
              UNION
              SELECT block_number
              FROM curve_stakes
              WHERE block_number = (SELECT MAX(block_number) FROM curve_stakes)
              UNION
              SELECT block_number
              FROM curve_unstakes
              WHERE block_number = (SELECT MAX(block_number) FROM curve_unstakes)
             ) AS M
        WHERE block_number =
              (SELECT MAX(block_number)
               FROM (SELECT block_number
                     FROM curve_burns
                     WHERE block_number = (SELECT MAX(block_number) FROM curve_burns)
                     UNION
                     SELECT block_number
                     FROM curve_mints
                     WHERE block_number = (SELECT MAX(block_number) FROM curve_mints)
                     UNION
                     SELECT block_number
                     FROM curve_burns_one
                     WHERE block_number = (SELECT MAX(block_number) FROM curve_burns_one)
                     UNION
                     SELECT block_number
                     FROM curve_stakes
                     WHERE block_number = (SELECT MAX(block_number) FROM curve_stakes)
                     UNION
                     SELECT block_number
                     FROM curve_unstakes
                     WHERE block_number = (SELECT MAX(block_number) FROM curve_unstakes)
                    ) AS M2
              );`;
  }

  private static createArrayOfBlockNumbers(firstBlock: number, lastBlock: number): Array<number> {
    const blockNumbers = [];
    for (let i = firstBlock; i <= lastBlock; i++) {
      blockNumbers.push(i);
    }
    return blockNumbers;
  }

  private async getFirstBlockNumber(): Promise<string> {
    return this.getBlockNumber('asc');
  }

  private async getLastBlockNumber(): Promise<string> {
    return this.getBlockNumber('desc');
  }

  private async getBlockNumber(orderDirection: string): Promise<string> {
    return (
      await axios.post(
        this.configService.get<string>('CURVE_REQUEST_URL'),
        CurveService.getBlockNumberQuery(orderDirection),
      )
    ).data.data.firssttx[0].block;
  }

  private static getBlockNumberQuery(orderDirection: string): TheGraphQuery {
    return {
      operationName: 'BlockNumber',
      variables: {},
      query: `query {
				firssttx: transactions (first:1, orderBy:timestamp, orderDirection:${orderDirection}) {
					block
				}
			}`,
    };
  }
}
