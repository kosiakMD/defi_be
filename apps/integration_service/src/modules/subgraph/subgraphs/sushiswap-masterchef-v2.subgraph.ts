import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainIdEnum, Logger } from '@app/common';

import { getMasterChefV2PositionsQuery } from '../../protocol/protocols/sushiswap/queries/masterchef-v2.query';
import { ISushiSwapMasterChefV2 } from '../../protocol/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapMasterChefV2Subgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('SUSHISWAP_ETH_MASTERCHEF_V2_SUBGRAPH_URL')],
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
  ): Promise<ISushiSwapMasterChefV2> {
    if (!this.isSupportedChain(chain)) return;

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getMasterChefV2PositionsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return;
    }

    return {
      users: response.data.data.users,
      masterChef: response.data.data.masterChefs[0],
    };
  }
}
