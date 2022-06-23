import {
  AssetsBalance,
  CardanoService,
} from 'apps/account/src/common/providers/3rdparty/cardano.service';

import { Injectable } from '@nestjs/common';

import { CARDANO_COIN_ADDRESS } from '@app/common/constant';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { BaseBalanceStrategy } from '../../../common/services/base-balance.strategy';
import { BalancesRequest } from '../../../common/types';

import type { TokenBalance } from '../balances.interfaces';

@Injectable()
export class CardanoBalancesStrategy
  extends BaseBalanceStrategy
  implements BalancesLoadingStrategy
{
  private readonly MAX_COUNT_PER_PAGE = 100;
  constructor(private readonly cardanoService: CardanoService) {
    super();
  }

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
  }: BalancesRequest): Promise<TokenBalance[]> {
    if (!originalTokens.length || !address.match(/^addr1.*/) || this.isAddressInBlockList(address))
      return [];

    const tokensFilter = new Set<string>(originalTokens.map((token) => token.replace(/\./, '')));

    try {
      const stakeAddress = this.cardanoService.getStakeAddress(address);
      const [total, assets] = await Promise.all([
        this.cardanoService.obtainInformationAboutStakedAccount(stakeAddress),
        this.getAllTokensByAddress(stakeAddress),
      ]);

      const isAccountDelegatedToPool = total.pool_id !== null;

      /** Coins delegated to the pool are excluded from balances and returned as part of delegations
       *  In Cardano it's possible to delegate all coins to a single pool only
       *  ADA coins will shown then in assets list
       */
      if (!isAccountDelegatedToPool) {
        assets.push({
          quantity: total.controlled_amount,
          unit: 'lovelace',
        });
      }

      return this.mapCardanoResponse(assets, tokensFilter, chainId);
    } catch (error) {
      return this.returnZeroBalanceAddressOrError(error, chainId);
    }
  }

  private async getAllTokensByAddress(stakeAddress: string): Promise<AssetsBalance> {
    const fetchedTokens = await this.cardanoService.assetsFromStakeAddress(stakeAddress);

    if (fetchedTokens.length < this.MAX_COUNT_PER_PAGE) {
      return fetchedTokens;
    } else {
      return await this.getTokensByRecursive(stakeAddress, fetchedTokens, 1);
    }
  }

  private async getTokensByRecursive(
    stakeAddress: string,
    prevTokens: AssetsBalance = [],
    page = 0,
  ): Promise<AssetsBalance> {
    if (prevTokens.length < this.MAX_COUNT_PER_PAGE) {
      return prevTokens;
    } else {
      const fetchedTokens = await this.cardanoService.assetsFromStakeAddress(stakeAddress, {
        page,
      });
      return prevTokens.concat(
        await this.getTokensByRecursive(stakeAddress, fetchedTokens, page + 1),
      );
    }
  }

  private mapCardanoResponse(
    assets: AssetsBalance,
    tokensFilter: Set<string>,
    chainId: number,
  ): TokenBalance[] {
    const tokenBalances: TokenBalance[] = [];
    for (const asset of assets) {
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

  private returnZeroBalanceAddressOrError(error: any, chainId: number) {
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

  private isAddressInBlockList(address: string): boolean {
    /** temporary created blocked list addresses */
    const blockList = new Set(['addr1w999n67e86jn6xal07pzxtrmqynspgx0fwmcmpua4wc6yzsxpljz3']);
    return blockList.has(address);
  }
}
