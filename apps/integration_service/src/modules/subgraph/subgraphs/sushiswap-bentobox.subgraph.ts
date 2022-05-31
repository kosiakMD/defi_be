import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainIdEnum, Logger } from '@app/common';

import { getLendingPositionsQuery } from '../../protocol/protocols/sushiswap/queries/bentobox.query';
import { ISushiSwapBentoBoxUsers } from '../../protocol/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapBentoBoxSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.arbi, this.getConfigSubgraph('ARBI')],
      [ChainIdEnum.bnb, this.getConfigSubgraph('BSC')],
      [ChainIdEnum.eth, this.getConfigSubgraph('ETH')],
      [ChainIdEnum.plg, this.getConfigSubgraph('PLG')],
      [ChainIdEnum.gnosis, this.getConfigSubgraph('GNOSIS')],
    ]);
  }

  getConfigSubgraph(subgraphChain: string) {
    return this.configService.get<string>(`SUSHISWAP_${subgraphChain}_BENTOBOX_SUBGRAPH_URL`);
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

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getLendingPositionsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return [];
    }

    return response.data.data.users;
  }
}
