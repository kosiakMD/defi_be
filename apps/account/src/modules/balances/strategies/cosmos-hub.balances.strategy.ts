import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/common';

import { isBech32LikeAddress } from '@app/common/utils';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { CosmosBalance, CosmosWallet } from '../../../common/interfaces/cosmos.interface';
import { BaseBalanceStrategy } from '../../../common/services/base-balance.strategy';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

export abstract class CosmosHubBalancesStrategy
  extends BaseBalanceStrategy
  implements BalancesLoadingStrategy
{
  protected abstract httpService: HttpService;
  protected abstract endpoint: string;

  async getBalances(request: BalancesRequest): Promise<TokenBalance[]> {
    if (!isBech32LikeAddress(request.address)) return [];

    const wallet: CosmosWallet = await firstValueFrom(
      this.httpService
        .get(this.makeBalanceEndpoint(request.address))
        .pipe(map((response) => response.data)),
    );

    return this.mapCosmosResponse(wallet.balances, request);
  }

  protected async mapCosmosResponse(
    balances: CosmosBalance[],
    request: BalancesRequest,
  ): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = [];
    const tokenSet = new Set(request.tokens);

    for (const balance of balances) {
      if (tokenSet.has(balance.denom)) {
        tokenBalances.push({
          amount: balance.amount.toString(),
          token: {
            chainId: request.chainId,
            address: balance.denom,
          },
        });
      }
    }

    return tokenBalances;
  }

  protected makeBalanceEndpoint(address: string): string {
    return new URL('/cosmos/bank/v1beta1/balances/' + address, this.endpoint).toString();
  }
}
