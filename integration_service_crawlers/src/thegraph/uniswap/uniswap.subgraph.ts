import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { LiquidityPositionSnapshot } from './liquidity.position.snapshot';
import { Pair } from './pair.interface';
import { Transaction } from './transaction';

@Injectable()
export class UniswapSubgraph {
  protected subgraphUrl: string;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('AMM_UNISWAP_SUBGRAPH_URL');
  }
  async getPairs(minReserve: number): Promise<ResponseData> {
    return this.httpService
      .post<ResponseData>(this.subgraphUrl, {
        operationName: 'pairs',
        variables: {},
        query: `
        {
          from0to1000: pairs (
            first: 1000,
            skip: 0,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}}
          ) {
            id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
          from1000to2000: pairs (
            first: 1000,
            skip: 1000,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}}
          ) {
          	id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
          from2000to3000: pairs (
            first: 1000,
            skip: 2000,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}}
          ) {
            id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
        }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
  async getPairsInBlockState(minReserve: number, blockNumber: number): Promise<ResponseData> {
    return this.httpService
      .post<ResponseData>(this.subgraphUrl, {
        operationName: 'pairs',
        variables: {},
        query: `
        {
          from0to1000: pairs (
            first: 1000,
            skip: 0,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}},
            block: {number: ${blockNumber}}
          ) {
            id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
          from1000to2000: pairs (
            first: 1000,
            skip: 1000,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}}
          ) {
						id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
          from2000to3000: pairs (
            first: 1000,
            skip: 2000,
            orderBy: reserveUSD,
            orderDirection: desc,
            where: {reserveUSD_gt: ${minReserve}}
          ) {
            id
            untrackedVolumeUSD
            reserveUSD
            reserve0
            reserve1
            totalSupply
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
        }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getBlock(direction: string): Promise<ResponseTransactionData> {
    return this.httpService
      .post(this.subgraphUrl, {
        operationName: 'BlockNumber',
        variables: {},
        query: `query {
					transactions (first:1, orderBy:timestamp, orderDirection:${direction}) {
						blockNumber
					}
				}`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getShapshotsByBlockNumber(blockNumber: number): Promise<ResponseSnapshotsData> {
    return this.httpService
      .post<ResponseSnapshotsData>(this.subgraphUrl, {
        operationName: 'snapshots',
        variables: {
          blockNumber: blockNumber,
        },
        query: `query liquidityPositionSnapshots($blockNumber: Int!) {
					snapshots: liquidityPositionSnapshots(first: 1000 block:{number: $blockNumber}, where:{block: $blockNumber}) {
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
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getTransactionsByBlockNumber(blockNumber: number): Promise<ResponseTransactionData> {
    return this.httpService
      .post<ResponseTransactionData>(this.subgraphUrl, {
        operationName: 'transactions',
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
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}

interface ResponseTransactionData {
  data: {
    transactions: Transaction[];
  };
}

interface ResponseSnapshotsData {
  data: {
    snapshots: LiquidityPositionSnapshot[];
  };
}

export interface ResponseData {
  data: {
    from0to1000: Pair[];
    from1000to2000: Pair[];
    from2000to3000: Pair[];
  };
}
