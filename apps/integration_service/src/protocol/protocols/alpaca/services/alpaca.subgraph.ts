import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address } from '@app/common';

import { AlpacaUser } from '../alpaca.interfaces';

@Injectable()
export class AlpacaSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = this.configService.get<string>('ALPACA_SUBGRAPH_URL');
  }

  async getSubgraphData(addresses: Address[]): Promise<AlpacaUser[]> {
    const addressesString = addresses.map((address) => `"${address}"`).join(',');
    const response = await this.httpService
      .post(this.subgraphUrl, {
        operationName: 'users',
        query: `{
        users(where: {id_in: [${addressesString}]}) {
          id
          balances {
            id
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
