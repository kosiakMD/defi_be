import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapLikeSubgraph } from './uniswap-like-subgraph.service';

@Injectable()
export class PancakeSubgraph extends UniswapLikeSubgraph {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService, 'AMM_PANCAKE_SUBGRAPH_URL');
  }
}
