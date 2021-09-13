import { map } from 'rxjs/operators';
import { SubgraphPairsResponseDto } from 'src/quickswap/dto';
import { wrapInQuotes } from 'src/utils/string';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from 'src/common/types';

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  getPairs(tokenAddresses: Address[]): Promise<SubgraphPairsResponseDto> {
    return this.httpService
      .post(this.subgraphUrl, {
        operationName: 'pairs',
        query: `{
          pairs(where:{id_in:[${tokenAddresses.map(wrapInQuotes)}]}) {
            id
            token0 {
              id
              name
              symbol
              decimals
            }
            token1 {
              id
              name
              symbol
              decimals
            }
            reserveUSD
            reserve0
            reserve1
            totalSupply
          }
        }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}
