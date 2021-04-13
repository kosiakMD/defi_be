import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Pair } from './pair.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UniswapSubgraph {
	protected subgraphUrl: string;
	constructor(
		protected readonly httpService: HttpService,
		protected readonly configService: ConfigService
	) {
		this.subgraphUrl = this.configService.get<string>('AMM_UNISWAP_SUBGRAPH_URL')
	}
	async getPairs(minReserve: number): Promise<ResponseData> {
		return this.httpService.post<ResponseData>(this.subgraphUrl, {
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
		}).pipe(map(response => response.data))
			.toPromise()
	}
	async getPairsInBlockState(minReserve: number, blockNumber: number): Promise<ResponseData> {
		return this.httpService.post<ResponseData>(this.subgraphUrl, {
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
		}).pipe(map(response => response.data))
			.toPromise()
	}
}

export interface ResponseData {
	data: {
		from0to1000: Pair[],
		from1000to2000: Pair[],
		from2000to3000: Pair[]
	}
}

