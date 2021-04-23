import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { LiquidityPositionResponseData } from '../interfaces/liquidity.position.interfaces';
import { StakingPositionResponse } from '../interfaces/staking.position.interfaces';
import { Pair } from './uniswap/pair.dto';

@Injectable()
export class UniswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.subgraphUrl = configService.get<string>('AMM_UNISWAP_SUBGRAPH_URL');
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

  async getUniswapLiquidityPositions(addresses: string[]): Promise<LiquidityPositionResponseData> {
    return this.httpService
      .post<LiquidityPositionResponseData>(this.subgraphUrl, {
        operationName: 'liquidityPositions',
        variables: {
          addresses: addresses,
        },
        query: `
      query liquidityPositionQuery($addresses: [String]) {
      liquidityPositions (where:{user_in:$addresses}, first:1000) {
        liquidityTokenBalance
        user {
          id
        }
        pair {
          id
          totalSupply
          reserveUSD
          reserve0
          reserve1
          token0Price
          token1Price
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
      }
	  }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getStakingPositions(addresses: string[]): Promise<StakingPositionResponse> {
    const url = this.configService.get<string>('THEGRAPH_SUSHISWAP_STAKING_POSITIONS');
    const addressesString = addresses.map((address) => `"${address}"`).join(',');
    return this.httpService
      .post(url, {
        operationName: 'stakingPositions',
        variables: {
          addresses: addresses,
        },
        query: `{
                users (where: {address_in:[${addressesString}], pool_not:null, amount_not:0}) {
                id
                pool {
                    id
                    pair
                }
                amount
                }
            }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}

export interface ResponseData {
  data: {
    from0to1000: Pair[];
    from1000to2000: Pair[];
    from2000to3000: Pair[];
  };
}

/* TODO: use query builder or gql
 import * as gql from 'gql-query-builder';
 "gql-query-builder": "^3.5.5",
 "graphql-tag": "^2.11.0",
const newQuery = (addresses) => {
  const query = gql.query({
    operation: 'liquidityPositions',
    variables: {
      where: { ['user_in']: addresses },
      addresses: addresses,
      first: 1000,
    },
    fields: [
      'liquidityTokenBalance',
      { user: ['id'] },
      {
        pair: [
          'id',
          'totalSupply',
          'reserveUSD',
          'reserve0',
          'reserve1',
          'token0Price',
          'token1Price',
          'totalSupply',
          { token0: ['id', 'name', 'symbol', 'decimals'] },
          { token1: ['id', 'name', 'symbol', 'decimals'] },
        ],
      },
    ],
  });

  return query;
};
newQuery([1]);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const oldQuery = `
      query liquidityPositionQuery($addresses: [String]) {
      liquidityPositions (where:{user_in:$addresses}, first:1000) {
        liquidityTokenBalance
        user {
          id
        }
        pair {
          id
          totalSupply
          reserveUSD
          reserve0
          reserve1
          token0Price
          token1Price
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
      }
	  }`;
*/
