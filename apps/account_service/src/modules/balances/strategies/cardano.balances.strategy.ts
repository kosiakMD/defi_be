import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import type { CardanoBalance } from '../../../common/interfaces/cardano.interface';
import { Web3Provider } from '../../../common/providers/chainRelated/web3.provider';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

export class CardanoBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly web3Provider: Web3Provider,
  ) {}

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
  }: BalancesRequest): Promise<TokenBalance[]> {
    if (!originalTokens.length || !address.match(/^addr1.*/)) {
      return [];
    }
    const tokensFilter = new Set<string>(originalTokens);
    const cardano = this.web3Provider.getCardanoInstance(chainId);
    try {
      const wallet = await cardano.addresses(address);
      return this.mapCardanoResponse(wallet, tokensFilter, chainId);
    } catch (error) {
      return this.returnZeroBalanceAddressOrError(error, chainId);
    }
  }

  private mapCardanoResponse(
    wallet: CardanoBalance,
    tokensFilter: Set<string>,
    chainId: ChainIdEnum,
  ): TokenBalance[] {
    const tokenBalances: TokenBalance[] = [];
    for (const asset of wallet.amount) {
      if (tokensFilter.has(asset.unit) || asset.unit === 'lovelace') {
        tokenBalances.push({
          token: {
            chainId: chainId,
            address: asset.unit !== 'lovelace' ? asset.unit : CARDANO_COIN_ADDRESS,
          },
          amount: asset.quantity,
        });
      }
    }

    return tokenBalances;
  }

  private returnZeroBalanceAddressOrError(error: any, chainId: ChainIdEnum) {
    /** blockfrost couldn't load information about the wallet if it has 0 coins. status 404 */
    if (error.status_code === 404) {
      return [
        {
          token: {
            chainId: chainId,
            address: CARDANO_COIN_ADDRESS,
          },
          amount: '0',
        },
      ];
    }

    throw new Error(error);
  }
}
