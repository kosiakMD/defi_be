import { Inject, Injectable } from '@nestjs/common';
import { BlocksSubgraph } from '../thegraph/blocks/blocks.subgraph';
import { CHAIN_ETH, PROJECT_SUSHISWAP } from './pools.utils';
import { SushiswapSubgraph } from '../thegraph/sushiswap/sushiswap.subgraph';
import { PoolsServiceUniswap } from './pools.service.uniswap';

@Injectable()
export class PoolsServiceSushiswap extends PoolsServiceUniswap{
	protected chain: string = CHAIN_ETH
	protected project: string = PROJECT_SUSHISWAP
	constructor(@Inject(SushiswapSubgraph) protected readonly sushiswapSubgraph: SushiswapSubgraph,
							@Inject(BlocksSubgraph) protected readonly blocksSubgraph: BlocksSubgraph
	) {
		super(sushiswapSubgraph, blocksSubgraph)
	}
}
