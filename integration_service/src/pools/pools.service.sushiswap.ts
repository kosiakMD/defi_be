import { Inject, Injectable } from '@nestjs/common';

import { BlocksSubgraph } from '../thegraph/blocks.subgraph';
import { SushiswapSubgraph } from '../thegraph/sushiswap.subgraph';
import { PoolsServiceUniswap } from './pools.service.uniswap';
import { CHAIN_ETH, PROJECT_SUSHISWAP } from './pools.utils';

@Injectable()
export class PoolsServiceSushiswap extends PoolsServiceUniswap {
  protected chain: string = CHAIN_ETH;
  protected project: string = PROJECT_SUSHISWAP;

  constructor(
    @Inject(SushiswapSubgraph) protected readonly sushiswapSubgraph: SushiswapSubgraph,
    @Inject(BlocksSubgraph) protected readonly blocksSubgraph: BlocksSubgraph,
  ) {
    super(sushiswapSubgraph, blocksSubgraph);
  }
}
