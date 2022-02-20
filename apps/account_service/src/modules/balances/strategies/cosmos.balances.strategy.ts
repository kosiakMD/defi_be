import { Injectable } from '@nestjs/common';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { CosmosBalance } from '../../../common/interfaces/cosmos.interface';
import { CosmosService } from '../../../common/providers/3rdparty/cosmos/cosmos.service';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

@Injectable()
export class CosmosBalancesStrategy implements BalancesLoadingStrategy {
  constructor(private readonly cosmosServise: CosmosService) {}

  async getBalances(request: BalancesRequest): Promise<TokenBalance[]> {
    if (!this.cosmosServise.isCosmosAddress(request.address)) return [];

    const balances: CosmosBalance[] = await this.cosmosServise.getBalances(request.address);
    return this.mapCosmosResponse(balances, request);
  }

  private mapCosmosResponse(balances: CosmosBalance[], request: BalancesRequest): TokenBalance[] {
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
}
