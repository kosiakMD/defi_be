import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapLikeSubgraph } from './uniswap-like-subgraph.service';

@Injectable()
export class PangolinSubgraph extends UniswapLikeSubgraph {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService, 'AMM_PANGOLIN_SUBGRAPH_URL');
  }
}
