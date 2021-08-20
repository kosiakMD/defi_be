import { BalancesResponse } from 'src/etherscan/interfaces';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountService {
  private getBalanceUrl: string;

  constructor(private httpService: HttpService, private configService: ConfigService) {
    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const port = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const balancePath = this.configService.get<string>('ACCOUNT_BALANCE');
    this.getBalanceUrl = `${url}/${balancePath}`;
  }

  async getBalances(addresses: string, chains?: number): Promise<BalancesResponse> {
    const data = await this.httpService
      .get(this.getBalanceUrl, { params: { addresses, chains } })
      .toPromise();
    return data.data;
  }
}
