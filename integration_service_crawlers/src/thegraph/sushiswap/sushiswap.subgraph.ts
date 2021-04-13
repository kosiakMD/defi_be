import { HttpService, Injectable } from '@nestjs/common';
import { UniswapSubgraph } from '../uniswap/uniswap.subgraph';
import { map } from 'rxjs/operators';
import { Pair } from '../uniswap/pair.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SushiswapSubgraph extends UniswapSubgraph {
	constructor(
		protected readonly httpService: HttpService,
		protected readonly configService: ConfigService
	) {
		super(httpService, configService);
		this.subgraphUrl = this.configService.get<string>('AMM_SUSHISWAP_SUBGRAPH_URL')
	}

	async getVaultsData(poolsIds: string[]): Promise<ResponseData> {
		return this.httpService.post<ResponseData>(this.subgraphUrl, {
			operationName: 'pairs',
			variables: {
				poolsIds: poolsIds
			},
			query: `
				query pairs($poolsIds: [String]!){
							pairs (where:{id_in:$poolsIds}, first: 1000) {
								id
								reserveUSD
								totalSupply
								token0 {
									id
									name
									symbol
								}
								token1 {
									id
									name
									symbol
								}
							}
					}`,
		}).pipe(map(response => response.data))
			.toPromise()
	}
}

interface ResponseData {
	data: {
		pairs: Pair[]
	}
}
