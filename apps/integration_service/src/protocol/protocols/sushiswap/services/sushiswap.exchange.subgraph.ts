import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainDto, ChainIdEnum } from '@app/common';

import { getLiquidityPositionsQuery, getPairsQuery } from '../queries/exchange.query';
import { ISushiSwapLiquidityPair, ISushiSwapUsers } from '../sushiswap.interfaces';

@Injectable()
export class SushiSwapExchangeSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.arbi, this.configService.get<string>('SUSHISWAP_ARBI_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.avax, this.configService.get<string>('SUSHISWAP_AVAX_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.bsc, this.configService.get<string>('SUSHISWAP_BSC_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.celo, this.configService.get<string>('SUSHISWAP_CELO_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.eth, this.configService.get<string>('SUSHISWAP_ETH_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.ftm, this.configService.get<string>('SUSHISWAP_FTM_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.harm, this.configService.get<string>('SUSHISWAP_ONE_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.heco, this.configService.get<string>('SUSHISWAP_HECO_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.plg, this.configService.get<string>('SUSHISWAP_MATIC_EXCHANGE_SUBGRAPH_URL')],
      [ChainIdEnum.xdai, this.configService.get<string>('SUSHISWAP_XDAI_EXCHANGE_SUBGRAPH_URL')],
    ]);
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
