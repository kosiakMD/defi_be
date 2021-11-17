import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common';
import { getKey } from '@app/common/utils/string';

import { PairsDto, SubgraphResponseDto } from '../subgraph';
import { wrapInQuotes } from '../utils/string';

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  async getPairs(pairsAddresses: Address[]): Promise<SubgraphResponseDto<PairsDto>> {
    const cachedPairs = await this.cache.get<SubgraphResponseDto<PairsDto>>(
      getKey('QuickSwap', 'subgraph', 'pairs', ...pairsAddresses),
    );

    if (cachedPairs) {
      return cachedPairs;
    } else {
      const pairs: SubgraphResponseDto<PairsDto> = await this.httpService
        .post(this.subgraphUrl, {
          operationName: 'pairs',
          query: `{
          pairs(where: {id_in: [${pairsAddresses.map(wrapInQuotes)}]}) {
            id
            reserve0
            reserve1
            reserveUSD
            totalSupply
            token0Price
            token1Price
            token0 {
              id
              symbol
              name
              decimals
            }
            token1 {
              id
              symbol
              name
              decimals
            }
          }
        }`,
        })
        .pipe(map((response) => response.data))
        .toPromise();

      await this.cache.set(getKey('QuickSwap', 'subgraph', 'pairs', ...pairsAddresses), pairs);

      return pairs;
    }
  }
}
