import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountService {
  private getBalanceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
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

export interface BalancesResponse {
  [address: string]: {
    totalUsd: number,
    tokens: BalanceToken[]
  }
}

export interface BalanceToken {
  amount: number;
  decimalsAmount: number;
  tokenPriceUSD: number;
  totalPriceUSD: number;
  token: Token
}

export interface Token {
  chainId: number;
  name: string;
  address: string;
  decimals: number;
  symbol: number;
}
