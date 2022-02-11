import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { Balance } from '../../../common/interfaces/cosmos.interface';
import { CosmosService } from '../../../common/providers/3rdparty/cosmos.service';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

export class CosmosBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly cosmosServise: CosmosService,
  ) {}

  async getBalances(request: BalancesRequest): Promise<TokenBalance[]> {
    const prefix = this.cosmosServise.getCosmosHubPrefix(request.address);
    if (prefix === '') return [];

    const wallet: Balance = await this.cosmosServise.getBalances(request.address, prefix);
    return this.mapCosmosResponse(wallet, request);
  }

  private mapCosmosResponse(wallet: Balance, request: BalancesRequest): TokenBalance[] {
    const tokenBalances: TokenBalance[] = [];
    const tokenSet = new Set(request.tokens);
    for (const balance of wallet.result) {
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
