import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/types';
import { BalancesResponse } from 'src/common/types/balances';

import { DetailedResponseDto } from '../dto';
import { Asset } from '../interfaces/transactions.interfaces';

@Injectable()
export class AccountService {
  private getBalanceUrl: string;
  private getAssetsUrl: string;

  constructor(private httpService: HttpService, private configService: ConfigService) {
    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const port = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const balancePath = this.configService.get<string>('ACCOUNT_BALANCE');
    this.getBalanceUrl = `${url}/${balancePath}`;

    const assetsPath = this.configService.get<string>('ACCOUNT_ASSETS');
    this.getAssetsUrl = `${url}/${assetsPath}`;
  }

  async getBalances(addresses: Address[], chains?: ChainIdEnum[]): Promise<BalancesResponse> {
    const data = await this.httpService
      .get(this.getBalanceUrl, { params: { addresses, chains } })
      .toPromise();
    return data.data;
  }

  async getAssets(
    addresses: Address[],
    chains?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const data = await this.httpService
      .get(this.getAssetsUrl, { params: { addresses, chains } })
      .toPromise();
    return data.data;
  }
}
