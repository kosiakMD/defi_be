import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '../common/types';

export interface Balance {
  id: string;
  balance: string;
  user: {
    id: string;
  };
}

@Injectable()
export class Pancakev2MainStakingSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('PANCAKEV2_MAIN_STAKING_SUBGRAPH_URL');
  }

  async getBalances(users: Address[]): Promise<Balance[]> {
    const response = await this.httpService
      .post(this.subgraphUrl, {
        variables: { users },
        query: `query GetUserData($users: [ID!]!) {
            balances(where: { user_in: $users, balance_gt: 0 } ) {
              id
              balance
              user {
                id
              }
            }
          }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();

    return response.data.balances;
  }
}
