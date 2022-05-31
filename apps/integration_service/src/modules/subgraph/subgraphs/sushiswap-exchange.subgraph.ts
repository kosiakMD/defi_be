import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainIdEnum, Logger } from '@app/common';

import {
  getLiquidityPositionsQuery,
  getPairsQuery,
} from '../../protocol/protocols/sushiswap/queries/exchange.query';
import {
  ISushiSwapLiquidityPair,
  ISushiSwapUsers,
} from '../../protocol/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapExchangeSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.arbi, this.getConfigSubgraph('ARBI')],
      [ChainIdEnum.avax, this.getConfigSubgraph('AVAX')],
      [ChainIdEnum.bnb, this.getConfigSubgraph('BSC')],
      [ChainIdEnum.celo, this.getConfigSubgraph('CELO')],
      [ChainIdEnum.eth, this.getConfigSubgraph('ETH')],
      [ChainIdEnum.ftm, this.getConfigSubgraph('FTM')],
      [ChainIdEnum.harm, this.getConfigSubgraph('ONE')],
      [ChainIdEnum.heco, this.getConfigSubgraph('HECO')],
      [ChainIdEnum.plg, this.getConfigSubgraph('MATIC')],
      [ChainIdEnum.gnosis, this.getConfigSubgraph('GNOSIS')],
      [ChainIdEnum.mriver, this.getConfigSubgraph('MRIVER')],
    ]);
  }

  getConfigSubgraph(subgraphChain: string) {
    return this.configService.get<string>(`SUSHISWAP_${subgraphChain}_EXCHANGE_SUBGRAPH_URL`);
  }

  isSupportedChain(chain: ChainDto) {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto) {
    return this.subgraphUrls.get(chain.id);
  }

  async getPairs(addresses: Address[], chain: ChainDto): Promise<ISushiSwapLiquidityPair[]> {
    if (!this.isSupportedChain(chain)) return Promise.resolve([]);

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getPairsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return;
    }

    return response.data.data.pairs;
  }

  async getLiquidityPositions(addresses: Address[], chain: ChainDto): Promise<ISushiSwapUsers[]> {
    if (!this.isSupportedChain(chain)) return Promise.resolve([]);

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getLiquidityPositionsQuery,
    });

    const response = await firstValueFrom(response$);

    if (response.data.errors) {
      this.logger.error(response.data.errors);
      return;
    }

    return response.data.data.users;
  }
}
