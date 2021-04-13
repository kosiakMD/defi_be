import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Pool } from './pool.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BalancerSubgraph {
	protected subgraphUrl: string;
	constructor(
		private readonly httpService: HttpService,
		protected readonly configService: ConfigService
	) {
		this.subgraphUrl = this.configService.get<string>('AMM_BALANCER_SUBGRAPH_URL')
	}
	async getPairs(minReserve: number): Promise<ResponseData> {
		return this.httpService.post<ResponseData>(this.subgraphUrl, {
			operationName: 'pairs',
			variables: {},
			query: `
        {
					from0to1000: pools(where: 
						{
							active: true, 
							tokensCount_gt: 1, 
							finalized: true, 
							liquidity_gt: ${minReserve}
						},
						first: 1000, 
						orderBy: liquidity, 
						orderDirection: desc
							) {
										id
										totalSwapVolume
										liquidity
										swapFee
										totalShares
										tokens {
											address
											balance
											decimals
											symbol
											name
											denormWeight
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
					from0to1000: pools(where: 
						{
							active: true, 
							tokensCount_gt: 1, 
							finalized: true, 
							liquidity_gt: ${minReserve}
						},
						first: 1000, 
						orderBy: liquidity, 
						orderDirection: desc,
						block: {number: ${blockNumber}}
							) {
										id
										totalSwapVolume
										liquidity
										swapFee
										totalShares
										tokens {
											address
											balance
											decimals
											symbol
											name
											denormWeight
										}
									}
				}`,
		}).pipe(map(response => response.data))
			.toPromise()
	}
}

export interface ResponseData {
	data: {
		from0to1000: Pool[]
	}
}
