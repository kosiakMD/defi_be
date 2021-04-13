import { HttpService, Injectable } from '@nestjs/common';
import { BlocksSubgraph } from './blocks.subgraph';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlocksBscSubgraph extends BlocksSubgraph {
	protected subgraphUrl: string;
	constructor(
		protected readonly httpService: HttpService,
		protected readonly configService: ConfigService
	) {
		super(httpService, configService)
		this.subgraphUrl = this.configService.get<string>('BLOCKS_BSC_SUBGRAPH_URL')
	}
}
