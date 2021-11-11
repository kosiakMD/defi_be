import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import { getLendingPositionsQuery } from '../queries/bentobox.query';
import { ISushiSwapBentoBoxUsers } from '../sushiswap.interfaces';

@Injectable()
export class SushiSwapBentoBoxSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('SUSHISWAP_ETH_BENTOBOX_SUBGRAPH_URL')],
    ]);
  }

  isSupportedChain(chain: ChainDto) {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto) {
    return this.subgraphUrls.get(chain.id);
  }

  async getLendingPositions(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<ISushiSwapBentoBoxUsers[]> {
    if (!this.isSupportedChain(chain)) return;

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getLendingPositionsQuery,
      })
      .pipe(map((response) => response.data.data.users))
      .toPromise();
  }
}
