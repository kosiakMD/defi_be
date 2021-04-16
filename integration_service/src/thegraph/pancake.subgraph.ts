import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapSubgraph } from './uniswap.subgraph';

@Injectable()
export class PancakeSubgraph extends UniswapSubgraph {
  protected subgraphUrl: string = process.env.AMM_PANCAKE_SUBGRAPH_URL;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService);
    this.subgraphUrl = configService.get<string>('AMM_PANCAKE_SUBGRAPH_URL');
  }
}
