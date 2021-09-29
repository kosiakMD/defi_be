import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from 'src/common/types';

import { PairsDto, ResponseDto, UsersDto } from '../quickswap/dto/subgraph';

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  getUsers(accountAddresses: Address[]): Promise<ResponseDto<UsersDto>> {
    return this.httpService
      .post(this.subgraphUrl, {
        operationName: 'users',
        variables: { users: accountAddresses },
        query: `query GetUsersData($users: [ID!]!) {
          users(where: { id_in: $users }) {
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

  getPairs(pairsAddresses: Address[]): Promise<ResponseDto<PairsDto>> {
    return this.httpService
      .post(this.subgraphUrl, {
        operationName: 'pairs',
        variables: { pairs: pairsAddresses },
        query: `query GetPairsData($pairs: [ID!]!) {
          pairs(where: { id_in: $pairs }) {
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
