import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import type { Address } from '@app/common/types';

import { cosmosTokenProvidersMap } from '../../constant/tokens';
import type { Balance } from '../../interfaces/cosmos.interface';

@Injectable()
export class CosmosService {
  protected readonly url: string;

  constructor(private readonly httpService: HttpService) {}

  public async getBalances(address: Address, prefix: string): Promise<Balance> {
    const tokenHolder = cosmosTokenProvidersMap.get(prefix);
    const balanceURL = this.getBalanceUrl(address, tokenHolder);
    return firstValueFrom(
      this.httpService.get<Balance>(balanceURL).pipe(map((response) => response.data)),
    );
  }

  public getCosmosHubPrefix(address: string): string {
    for (const cosmosPrefix of cosmosTokenProvidersMap.keys()) {
      const matcher = new RegExp(`^${cosmosPrefix}`, 'g');
      if (matcher.test(address)) {
        return cosmosPrefix;
      }
    }
    return '';
  }

  private getBalanceUrl(address: Address, tokenHolder: string): string {
    return `https://lcd-${tokenHolder}.keplr.app/bank/balances/${address}`;
  }
}
