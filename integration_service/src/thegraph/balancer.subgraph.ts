import { HttpService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapSubgraph } from './uniswap.subgraph';

@Injectable()
export class SushiswapSubgraph extends UniswapSubgraph {
  protected subgraphUrl: string;
  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService);

    this.subgraphUrl = configService.get<string>('AMM_SUSHISWAP_SUBGRAPH_URL');
  }
}
