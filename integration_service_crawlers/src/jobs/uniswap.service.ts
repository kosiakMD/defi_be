import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import pLimit from 'p-limit';

import { DatabaseService } from '../DB/database.service';
import { TheGraphQuery } from '../app/interfaces/graph.interface';

axiosRetry(axios, {
  retries: 1e9,
  retryCondition: () => true,
  shouldResetTimeout: true,
  retryDelay: axiosRetry.exponentialDelay,
});

@Injectable()
export class UniswapService {
  constructor(private databaseService: DatabaseService, private configService: ConfigService) {}

  public async startMigration(): Promise<void> {
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
    const [transactions, snapshots] = await Promise.all([
      this.getTransactionsByNumber(number),
      this.getSnapshotsByNumber(number),
    ]);

    const {
      uniswapMintsSqlValues,
      uniswapBurnsSqlValues,
      uniswapSwapsSqlValues,
    } = this.formatAllTransactions(transactions);
    const uniswapSnapshotsSqlValues = this.getSnapshotsSqlStringValues(snapshots);

    const promisesPool = [];

    if (uniswapMintsSqlValues) {
      const mintsInsertQuery = UniswapService.getSqlQueryString(
        uniswapMintsSqlValues,
        'uniswap_mints',
      );
      promisesPool.push(databaseClient.query(mintsInsertQuery));
    }
    if (uniswapBurnsSqlValues) {
      const burnsInsertQuery = UniswapService.getSqlQueryString(
        uniswapBurnsSqlValues,
        'uniswap_burns',
      );
      promisesPool.push(databaseClient.query(burnsInsertQuery));
    }
    if (uniswapSwapsSqlValues) {
      const swapsInsertQuery = UniswapService.getSwapsSqlQueryString(
        uniswapSwapsSqlValues,
        'uniswap_swaps',
      );
      promisesPool.push(databaseClient.query(swapsInsertQuery));
    }
    if (uniswapSnapshotsSqlValues) {
      const snapshotsInsertQuery = UniswapService.getSnapshotsSqlQueryString(
        uniswapSnapshotsSqlValues,
        'uniswap_snapshots',
      );
      promisesPool.push(databaseClient.query(snapshotsInsertQuery));
    }

    if (promisesPool.length) await Promise.all(promisesPool);
  }

  private static getSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (sender, to_address, information, created_at, block_number)
						VALUES ${values}`;
  }

  private static getSwapsSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (sender, to_address, information, created_at, block_number, from_address)
						VALUES ${values}`;
  }

  private static getSnapshotsSqlQueryString(values: string, tableName: string): string {
    return `INSERT INTO ${tableName} (user_address, information, block_number, created_at)
						VALUES ${values}`;
  }

  private formatAllTransactions(transactions): Record<string, string> {
    return {
      uniswapMintsSqlValues: this.getSqlStringValues(transactions, 'mints'),
      uniswapBurnsSqlValues: this.getSqlStringValues(transactions, 'burns'),
      uniswapSwapsSqlValues: this.getSwapsSqlStringValues(transactions, 'swaps'),
    };
  }

  private async getTransactionsByNumber(blockNumber: number): Promise<any> {
    return (
      await axios.post(
        this.configService.get<string>('UNISWAP_REQUEST_URL'),
        UniswapService.getTransactionsQuery(blockNumber),
      )
    ).data.data?.transactions;
  }

  private async getSnapshotsByNumber(blockNumber: number): Promise<any> {
    return (
      await axios.post(
        this.configService.get<string>('UNISWAP_REQUEST_URL'),
        UniswapService.getSnapshotsQuery(blockNumber),
      )
    ).data.data?.liquidityPositionSnapshots;
  }

  private getSqlStringValues(transactions, field: string): string {
    return transactions
      .filter((transaction) => !!transaction[field].length)
      .map((transaction) => {
        return transaction[field]
          .map(
            (element) =>
              `('${element.sender}','${element.to}','${JSON.stringify(
                element,
              )}',to_timestamp(${parseInt(transaction.timestamp)}), ${parseInt(
                transaction.blockNumber,
              )})`,
          )
          .join(',');
      })
      .join(',');
  }

  private getSwapsSqlStringValues(transactions, field: string): string {
    return transactions
      .filter((transaction) => !!transaction[field].length)
      .map((transaction) => {
        return transaction[field]
          .map(
            (element) =>
              `('${element.sender}','${element.to}','${JSON.stringify(
                element,
              )}',to_timestamp(${parseInt(transaction.timestamp)}), ${parseInt(
                transaction.blockNumber,
              )}, '${element.from}')`,
          )
          .join(',');
      })
      .join(',');
  }

  private getSnapshotsSqlStringValues(snapshots): string {
    return snapshots
      .map(
        (snapshot) =>
          `('${snapshot.user.id}', '${JSON.stringify(snapshot)}', ${parseInt(
            snapshot.block,
          )}, to_timestamp(${parseInt(snapshot.timestamp)}))`,
      )
      .join(',');
  }

  private static getSnapshotsQuery(blockNumber: number): TheGraphQuery {
    return {
      operationName: 'Snapshots',
      variables: {
        blockNumber: blockNumber,
      },
      query: `query liquidityPositionSnapshots($blockNumber: Int!) {
				liquidityPositionSnapshots(first: 1000 block:{number: $blockNumber}, where:{block: $blockNumber}) {
					user {
						id
					}
					block
					timestamp
					pair {
						id
					}
					token0PriceUSD
					token1PriceUSD
					liquidityTokenTotalSupply
					reserveUSD
					reserve0
					reserve1
					liquidityTokenBalance
				}
			}`,
    };
  }

  private static getTransactionsQuery(blockNumber: number): TheGraphQuery {
    return {
      operationName: 'Transactions',
      variables: {
        blockNumber: blockNumber,
      },
      query: `query transactions($blockNumber: Int!) {
				transactions (first: 1000 block:{number: $blockNumber} where: {blockNumber: $blockNumber}) {
					blockNumber
					timestamp
					mints {
						sender
						to
						transaction {
							id
							timestamp
							blockNumber
						}
						liquidity
						amount0
						amount1
						amountUSD
						pair {
							id
							token0 {
								id
								name
								symbol
								decimals
							}
							token1 {
								id
								name
								symbol
								decimals
							}
						}
					}
					burns {
						sender
						to
						transaction {
							 id
							 timestamp
							 blockNumber
						}
						liquidity
						amount0
						amount1
						amountUSD
						pair {
							id
							token0 {
								id
								name
								symbol
								decimals
							}
							token1 {
								id
								name
								symbol
								decimals
							}
						}
					}
					swaps {
						sender
						from
						to
						transaction {
							 id
							 timestamp
							 blockNumber
						}
						amount0In
						amount1In
						amount0Out
						amount1Out
						amountUSD
						logIndex
						pair {
							id
							token0 {
								id
								name
								symbol
								decimals
							}
							token1 {
								id
								name
								symbol
								decimals
							}
						}
					}
				}
			}`,
    };
  }

  private async getBlocksToLoad(databaseClient): Promise<Array<number> | false> {
    const [lastBlockFromDB, lastBlock] = await Promise.all([
      (await databaseClient.query(UniswapService.queryToGetLastBlock())).rows[0]?.last_block,
      await this.getLastBlockNumber(),
    ]);

    if (lastBlockFromDB == lastBlock) return false;

    if (lastBlockFromDB)
      return UniswapService.createArrayOfBlockNumbers(
        parseInt(lastBlockFromDB) + 1,
        parseInt(lastBlock),
      );

    const firstBlock = await this.getFirstBlockNumber();
    return UniswapService.createArrayOfBlockNumbers(parseInt(firstBlock), parseInt(lastBlock));
  }

  private static queryToGetLastBlock(): string {
    return `
		SELECT block_number AS last_block
		FROM (SELECT block_number FROM uniswap_swaps WHERE block_number = (SELECT MAX(block_number) FROM uniswap_swaps)
					UNION
					SELECT block_number FROM uniswap_mints WHERE block_number = (SELECT MAX(block_number) FROM uniswap_mints)
					UNION
					SELECT block_number FROM uniswap_burns WHERE block_number = (SELECT MAX(block_number) FROM uniswap_burns)
					UNION
					SELECT block_number FROM uniswap_snapshots WHERE block_number = (SELECT MAX(block_number) FROM uniswap_snapshots)
				 ) AS M
	 	WHERE block_number =
				 (SELECT MAX(block_number)
						FROM (SELECT block_number FROM uniswap_swaps WHERE block_number = (SELECT MAX(block_number) FROM uniswap_swaps)
									UNION
									SELECT block_number FROM uniswap_mints WHERE block_number = (SELECT MAX(block_number) FROM uniswap_mints)
									UNION
									SELECT block_number FROM uniswap_burns WHERE block_number = (SELECT MAX(block_number) FROM uniswap_burns)
									UNION
									SELECT block_number FROM uniswap_snapshots WHERE block_number = (SELECT MAX(block_number) FROM uniswap_snapshots)
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
        this.configService.get<string>('UNISWAP_REQUEST_URL'),
        UniswapService.getBlockNumberQuery(orderDirection),
      )
    ).data.data.firssttx[0].blockNumber;
  }

  private static getBlockNumberQuery(orderDirection: string): TheGraphQuery {
    return {
      operationName: 'BlockNumber',
      variables: {},
      query: `query {
				firssttx: transactions (first:1, orderBy:timestamp, orderDirection:${orderDirection}) {
					blockNumber
				}
			}`,
    };
  }
}
