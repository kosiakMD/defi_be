import { Injectable } from '@nestjs/common';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Balance } from '../../../common/interfaces/ronin.interface';
import { RoninService } from '../../../common/providers/3rdparty/ronin.service';
import { BaseBalanceStrategy } from '../../../common/services/base-balance.strategy';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

@Injectable()
export class RoninBalancesStrategy extends BaseBalanceStrategy implements BalancesLoadingStrategy {
  constructor(private readonly roninService: RoninService) {
    super();
  }

  public async getBalances({ address, chainId, tokens }: BalancesRequest): Promise<any[]> {
    if (!this.roninService.isRoninAddress(address)) return [];

    const balances: Balance = await this.roninService.getBalances(address, tokens);

    return this.mapResponse(balances, chainId);
  }

  private mapResponse(balances: Balance, chainId: number): TokenBalance[] {
    const tokenBalances: TokenBalance[] = [];

    balances.forEach((amount, address) => {
      tokenBalances.push({
        amount,
        token: {
          chainId,
          address,
        },
      });
    });

    return tokenBalances;
  }
}
