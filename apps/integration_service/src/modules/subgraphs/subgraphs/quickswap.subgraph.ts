import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { gql } from '@app/common/utils/graphql';
import { getKey } from '@app/common/utils/string';

import { PairsDto } from '../dto/quickswap.subgraph.pairs.dto';
import { SubgraphResponseDto } from '../dto/subgraph.response.dto';

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  async getPairs(addresses: Address[]): Promise<SubgraphResponseDto<PairsDto>> {
    const cachedPairs = await this.cache.get<SubgraphResponseDto<PairsDto>>(
      getKey('QuickSwap', 'subgraph', 'pairs', ...addresses),
    );

    if (cachedPairs) {
      return cachedPairs;
    } else {
      const pairs: SubgraphResponseDto<PairsDto> = await this.httpService
        .post(this.subgraphUrl, {
          variables: { addresses },
          query: gql`
            query getPairs($addresses: [String!]!) {
              pairs(where: { id_in: $addresses }) {
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
            }
          `,
        })
        .pipe(map((response) => response.data))
        .toPromise();

      if (pairs.errors) {
        this.logger.error(pairs.errors);
      } else {
        await this.cache.set(getKey('QuickSwap', 'subgraph', 'pairs', ...addresses), pairs);
      }

      return pairs;
    }
  }
}
