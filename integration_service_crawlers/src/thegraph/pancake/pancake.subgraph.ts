import { HttpService, Injectable } from '@nestjs/common';
import { UniswapSubgraph } from '../uniswap/uniswap.subgraph';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PancakeSubgraph extends UniswapSubgraph {
	constructor(
		protected readonly httpService: HttpService,
		protected readonly configService: ConfigService
	) {
		super(httpService, configService);
		this.subgraphUrl = this.configService.get<string>('AMM_PANCAKE_SUBGRAPH_URL')
	}
}
