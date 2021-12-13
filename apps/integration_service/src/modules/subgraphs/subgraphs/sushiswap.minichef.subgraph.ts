import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainIdEnum, Logger } from '@app/common';

import { getMiniChefPositionsQuery } from '../../protocols/protocols/sushiswap/queries/minichef.query';
import { ISushiSwapMasterChef } from '../../protocols/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapMiniChefSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
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

  async getMiniChefPositions(addresses: Address[], chain: ChainDto): Promise<ISushiSwapMasterChef> {
    if (!this.isSupportedChain(chain)) return;

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getMiniChefPositionsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return;
    }

    return {
      users: response.data.data.users,
      masterChef: response.data.data.miniChefs[0],
    };
  }
}
