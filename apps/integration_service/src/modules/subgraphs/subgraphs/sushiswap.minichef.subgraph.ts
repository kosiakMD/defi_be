import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import { getMiniChefPositionsQuery } from '../../protocols/protocols/sushiswap/queries/minichef.query';
import { ISushiSwapMiniChef } from '../../protocols/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapMiniChefSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.arbi, this.getConfigSubgraph('ARBI')],
      [ChainIdEnum.harm, this.getConfigSubgraph('ONE')],
      [ChainIdEnum.celo, this.getConfigSubgraph('CELO')],
      [ChainIdEnum.mriver, this.getConfigSubgraph('MRIVER')],
      [ChainIdEnum.plg, this.getConfigSubgraph('PLG')],
      [ChainIdEnum.xdai, this.getConfigSubgraph('XDAI')],
    ]);
  }

  getConfigSubgraph(subgraphChain: string) {
    return this.configService.get<string>(`SUSHISWAP_${subgraphChain}_MINICHEF_SUBGRAPH_URL`);
  }

  isSupportedChain(chain: ChainDto) {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto) {
    return this.subgraphUrls.get(chain.id);
  }

  async getMiniChefPositions(addresses: Address[], chain: ChainDto): Promise<ISushiSwapMiniChef> {
    if (!this.isSupportedChain(chain)) return;

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getMiniChefPositionsQuery,
      })
      .pipe(
        map((response) => ({
          users: response.data.data.users,
          miniChef: response.data.data.miniChefs[0],
        })),
      )
      .toPromise();
  }
}
