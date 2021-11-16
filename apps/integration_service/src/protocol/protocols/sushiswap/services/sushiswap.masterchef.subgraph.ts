import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import { getMasterChefPositionsQuery } from '../queries/masterchef.query';
import { ISushiSwapMasterChef } from '../sushiswap.interfaces';

@Injectable()
export class SushiSwapMasterChefSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('SUSHISWAP_ETH_MASTERCHEF_SUBGRAPH_URL')],
    ]);
  }

  isSupportedChain(chain: ChainDto) {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto) {
    return this.subgraphUrls.get(chain.id);
  }

  async getMasterChefPositions(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<ISushiSwapMasterChef> {
    if (!this.isSupportedChain(chain)) return;

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getMasterChefPositionsQuery,
      })
      .pipe(
        map((response) => ({
          users: response.data.data.users,
          masterChef: response.data.data.masterChefs[0],
        })),
      )
      .toPromise();
  }
}
