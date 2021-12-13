import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import {
  getLiquidityPositionsQuery,
  getPairsQuery,
} from '../../protocols/protocols/sushiswap/queries/exchange.query';
import {
  ISushiSwapLiquidityPair,
  ISushiSwapUsers,
} from '../../protocols/protocols/sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapExchangeSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.arbi, this.getConfigSubgraph('ARBI')],
      [ChainIdEnum.avax, this.getConfigSubgraph('AVAX')],
      [ChainIdEnum.bsc, this.getConfigSubgraph('BSC')],
      [ChainIdEnum.celo, this.getConfigSubgraph('CELO')],
      [ChainIdEnum.eth, this.getConfigSubgraph('ETH')],
      [ChainIdEnum.ftm, this.getConfigSubgraph('FTM')],
      [ChainIdEnum.harm, this.getConfigSubgraph('ONE')],
      [ChainIdEnum.heco, this.getConfigSubgraph('HECO')],
      [ChainIdEnum.plg, this.getConfigSubgraph('MATIC')],
      [ChainIdEnum.xdai, this.getConfigSubgraph('XDAI')],
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

  getPairs(addresses: Address[], chain: ChainDto): Promise<ISushiSwapLiquidityPair[]> {
    if (!this.isSupportedChain(chain)) return Promise.resolve([]);

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getPairsQuery,
      })
      .pipe(map((response) => response.data.data.pairs as ISushiSwapLiquidityPair[]))
      .toPromise();
  }

  getLiquidityPositions(addresses: Address[], chain: ChainDto): Promise<ISushiSwapUsers[]> {
    if (!this.isSupportedChain(chain)) return Promise.resolve([]);

    return this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: getLiquidityPositionsQuery,
      })
      .pipe(map((response) => response.data.data.users as ISushiSwapUsers[]))
      .toPromise();
  }
}
