import { Injectable } from '@nestjs/common';

import { UniswapSubgraph } from './uniswap.subgraph';

@Injectable()
export class SushiswapSubgraph extends UniswapSubgraph {
  protected subgraphUrl: string = process.env.AMM_SUSHISWAP_SUBGRAPH_URL;
}
