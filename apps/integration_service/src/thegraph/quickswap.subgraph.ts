import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common';

import { PairsDto, SubgraphResponseDto, UsersDto } from '../quickswap/dto/subgraph';
import { wrapInQuotes } from '../utils/string';

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  getUsers(accountAddresses: Address[]): Promise<SubgraphResponseDto<UsersDto>> {
    return this.httpService
      .post(this.subgraphUrl, {
        operationName: 'users',
        query: `{
          users(where: {id_in: [${accountAddresses.map(wrapInQuotes)}]}) {
            id
            liquidityPositions {
              id
              liquidityTokenBalance
              pair {
                id
              }
            }
          }
        }
        `,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  getPairs(pairsAddresses: Address[]): Promise<SubgraphResponseDto<PairsDto>> {
    return this.httpService
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
  }
}
