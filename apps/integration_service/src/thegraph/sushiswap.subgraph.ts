import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapLikeSubgraph } from './uniswap-like-subgraph.service';

@Injectable()
export class SushiswapSubgraph extends UniswapLikeSubgraph {
  protected subgraphUrl: string = process.env.AMM_SUSHISWAP_SUBGRAPH_URL;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService, 'AMM_SUSHISWAP_SUBGRAPH_URL');
  }
}
