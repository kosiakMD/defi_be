import { map } from 'rxjs/operators';
import { MasterchefUser } from 'src/spookyswap/interfaces/masterchef.user.interfaces';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '../common/types';

@Injectable()
export class SpookyswapFarmSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('SPOOKYSWAP_FARM_SUBGRAPH_URL');
  }

  async getMasterchefData(users: Address[]): Promise<MasterchefUser[]> {
    const response = await this.httpService
      .post(this.subgraphUrl, {
        variables: { users },
        query: `query GetUserData($users: [ID!]!) {
            users(where: { id_in: $users } ) {
              id
              balances {
                id
                poolId
                staked
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
