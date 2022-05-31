import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common/types';

import { AceLabUser } from '../../protocol/protocols/spookyswap/spookyswap/acelab-user.interfaces';

@Injectable()
export class SpookyswapAceLabSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('SPOOKYSWAP_ACELAB_SUBGRAPH_URL');
  }

  async getMasterchefData(users: Address[]): Promise<AceLabUser[]> {
    const response = await this.httpService
      .post(this.subgraphUrl, {
        variables: { users },
        query: `query GetUserData($users: [ID!]!) {
            users(where: { id_in: $users } ) {
              id
              balances {
                id
                poolId
                reward
                balance
              }
            }
          }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();

    return response.data.users;
  }
}
