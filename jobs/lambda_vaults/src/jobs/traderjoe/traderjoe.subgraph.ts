import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common';

@Injectable()
export class TraderJoeSubgraph {
  protected readonly subgraphUrls: { [key in keyof typeof ChainIdEnum]?: string };

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.subgraphUrls = {
      [ChainIdEnum.avax]: this.configService.get<string>('TRADERJOE_SUBGRAPH_URL'),
    };
  }

  protected getChainSubgraphEndpoint(chainId: ChainIdEnum): string {
    return this.subgraphUrls[chainId.toString()];
  }

  async getPools(chainId: ChainIdEnum): Promise<any> {
    return this.httpService
      .post(this.getChainSubgraphEndpoint(chainId), {
        variables: {
          first: 500,
          skip: 0,
          orderBy: 'reserveUSD',
          orderDirection: 'desc',
          dateAfter: 1639324800,
        },
        query: `
        query pairsQuery($first: Int! = 1000, $skip: Int! = 0, $orderBy: String! = "reserveUSD", $orderDirection: String! = "desc", $dateAfter: Int! = 1622419200) {
          pairs(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
            id
            name
            token0Price
            token1Price
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol
              decimals
            }
            reserve0
            reserve1
            reserveUSD
            volumeUSD
          }
        }
      `,
      })
      .pipe(map((response) => response.data.data))
      .toPromise();
  }
}
