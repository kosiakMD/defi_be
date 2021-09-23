import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapSubgraph } from './uniswap.subgraph';

@Injectable()
export class PangolinSubgraph extends UniswapSubgraph {
  protected subgraphUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super(configService, httpService);
    this.subgraphUrl = configService.get<string>('AMM_PANGOLIN_SUBGRAPH_URL');
  }
}
