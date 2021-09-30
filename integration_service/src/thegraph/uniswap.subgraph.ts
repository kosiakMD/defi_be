import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapLikeSubgraph } from './uniswap-like-subgraph.service';
import { Pair } from './uniswap/pair.dto';

export interface ResponseData {
  data: {
    from0to1000: Pair[];
    from1000to2000: Pair[];
    from2000to3000: Pair[];
  };
}

@Injectable()
export class UniswapSubgraph extends UniswapLikeSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super();

    this.subgraphUrl = configService.get<string>('AMM_UNISWAP_SUBGRAPH_URL');
  }
}
