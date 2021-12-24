import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapLikeSubgraph } from './uniswap-like-subgraph.service';

@Injectable()
export class UniswapSubgraph extends UniswapLikeSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService, 'AMM_UNISWAP_SUBGRAPH_URL');
  }
}
