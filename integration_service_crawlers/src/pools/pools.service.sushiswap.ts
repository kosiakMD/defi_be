import { Inject, Injectable } from '@nestjs/common';

import { ProjectEnum } from '../config/projects';
import { BlocksSubgraph } from '../thegraph/blocks/blocks.subgraph';
import { SushiswapSubgraph } from '../thegraph/sushiswap/sushiswap.subgraph';
import { PoolsServiceUniswap } from './pools.service.uniswap';
import { CHAIN_ID_ETH } from './pools.utils';

@Injectable()
export class PoolsServiceSushiswap extends PoolsServiceUniswap {
  protected chain: number = CHAIN_ID_ETH;
  protected project: string = ProjectEnum.sushiswap;
  constructor(
    @Inject(SushiswapSubgraph) protected readonly sushiswapSubgraph: SushiswapSubgraph,
    @Inject(BlocksSubgraph) protected readonly blocksSubgraph: BlocksSubgraph,
  ) {
    super(sushiswapSubgraph, blocksSubgraph);
  }
}
