import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import { getSushiBarPositionsQuery } from '../../protocols/protocols/sushiswap/queries/sushibar.query';
import { ISushiSwapSushiSwapBarResponse } from '../../protocols/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapSushiBarSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('SUSHISWAP_ETH_SUSHIBAR_SUBGRAPH_URL')],
    ]);
  }

  isSupportedChain(chain: ChainDto) {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto) {
    return this.subgraphUrls.get(chain.id);
  }

  async getSushiBarPositions(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<ISushiSwapSushiSwapBarResponse> {
    if (!this.isSupportedChain(chain)) return;

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getSushiBarPositionsQuery,
      })
      .pipe(
        map((response) => ({
          users: response.data.data.users,
          bar: response.data.data.bars[0],
        })),
      )
      .toPromise();
  }
}
