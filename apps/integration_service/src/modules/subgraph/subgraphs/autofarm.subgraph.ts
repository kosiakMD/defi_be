import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common/types';

import { AutofarmUser } from '../../protocol/protocols/autofarm/autofarm.interfaces';

@Injectable()
export class AutofarmSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('AUTOFARM_SUBGRAPH_URL');
  }

  async getSubgraphData(addresses: Address[]): Promise<AutofarmUser[]> {
    const addressesString = addresses.map((address) => `"${address}"`).join(',');
    const response = await this.httpService
      .post(this.subgraphUrl, {
        operationName: 'users',
        query: `{
            users (where: {id_in: [${addressesString}]}) {
              id
              totalAmount
              balances {
              id
              amount
              }
            }
          }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();

    return response.data.users;
  }
}
