import { HttpService, Inject, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

import { LiquidityPositionResponseData } from '../uniswap/interfaces/liquidity.position.interfaces';
import { Pair } from './uniswap/pair.dto';

@Injectable()
export class UniswapSubgraph {
  protected subgraphUrl: string = process.env.AMM_UNISWAP_SUBGRAPH_URL;

  constructor(@Inject(HttpService) private readonly httpService: HttpService) {
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

  async getUniswapLiquidityPositions(addresses: string[]) {
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
}

export interface ResponseData {
  data: {
    from0to1000: Pair[];
    from1000to2000: Pair[];
    from2000to3000: Pair[];
  };
}
