import { AccountService } from 'apps/integration/src/modules/microservices/account.service';
import { MinSwapAssetService } from 'apps/integration/src/modules/microservices/minswap.asset.service.';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { normalizeDecimals } from '@app/common/utils';

import { FeatureEnum } from '../../../enums';
import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { CardanoCore } from '../../CardanoCore';
import {
  AVAILABLE_POOLS_QUERY,
  IPoolInfo,
  IPoolInfoResponse,
} from '../../Subgraphs/MinswapSubgraph';

export type IFeatureEntryMinimal = BaseWithTokens<ISupplyTokenMinimal[], void, void, void>;
export type IFeatureOpportunity = BaseWithTokens<ISupplyTokenOpportunity[], void, void, void>;
export type IFeatureUserEntry = BaseWithTokens<ISupplyTokenUserEntry[], void, void, void>;

export interface IMinSwapPoolsMeta extends IProtocolMeta {
  feature: FeatureEnum.pools;
  context: {
    endpoint: string;
  };
}

export class MinSwapPools extends CardanoCore<
  IFeatureEntryMinimal,
  IFeatureOpportunity,
  IFeatureUserEntry,
  IMinSwapPoolsMeta
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected assetService: MinSwapAssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  async getCacheableOpportunityData(): Promise<IFeatureEntryMinimal[]> {
    const pools = await this.fetchPools();
    return pools.map(this.minPoolToMinimalFeature.bind(this));
  }

  protected async fetchUserData(
    address: string,
    pools: IFeatureOpportunity[],
  ): Promise<IFeatureUserEntry[]> {
    const lpBalances = await this.accountService.getBalancesPost(
      [address],
      [this.meta.chain],
      Array.from(pools.map((x) => x.id.replace(/\./, ''))),
    );

    const userEntry: IFeatureUserEntry[] = [];

    for (const position of lpBalances[address].tokens) {
      const pool = pools.find((x) => x.id.replace(/\./, '') === position.token.address);
      if (!pool) continue;
      const amountBN = new BigNumber(position.decimalsAmount);
      const poolShare = amountBN.div(pool.token.totalSupplied);

      let token = null;
      if (pool.token) {
        token = {
          ...token,
          amount: amountBN.toNumber(),
          value: amountBN.times(token.price).toNumber(),
        };
      }

      userEntry.push({
        ...pool,
        token: token,
        supplied: pool.supplied.map((supply) => {
          const amount = poolShare.times(supply.totalSupplied);
          return {
            ...supply,
            amount: amount.toNumber(),
            value: amount.times(supply.token.price).toNumber(),
          };
        }),
      });
    }

    return userEntry;
  }

  private async fetchPools(): Promise<IPoolInfo[]> {
    const config = { headers: { origin: 'https://defiyield.app' } };
    const poolLength = 320;
    const limit = 20;
    const requests = [];
    for (let offset = 0; offset < poolLength; offset += limit) {
      const body = { query: AVAILABLE_POOLS_QUERY, variables: { limit, offset } };
      const $request = this.httpService
        .post<IPoolInfoResponse>(this.meta.context.endpoint + '?topPools', body, config)
        .pipe(map(({ data }) => data.data.topPools));

      requests.push(firstValueFrom($request));
    }

    const response = await Promise.allSettled(requests);
    const [data, errors] = handlePromiseAllSettled(response);

    if (errors.length > 0) {
      this.logger.error(`Couldn't process some of minswap pools: ${errors.length}`);
    }

    return data.flat();
  }

  /**
   * Formats basic HTTP result min farm to FeatureMinimal
   */
  private minPoolToMinimalFeature(pool: IPoolInfo): IFeatureEntryMinimal {
    return {
      id: this.toTokenId(pool.lpAsset.currencySymbol, pool.lpAsset.tokenName),
      chain: this.meta.chain,
      feature: this.meta.feature,
      token: {
        address: this.toTokenId(pool.lpAsset.currencySymbol, pool.lpAsset.tokenName),
        totalSupplied: pool.totalLiquidity.toString(),
      },
      supplied: [
        {
          token: {
            address: pool.assetA.currencySymbol
              ? this.toTokenId(pool.assetA.currencySymbol, pool.assetA.tokenName)
              : CARDANO_COIN_ADDRESS,
          },
          totalSupplied: pool.reserveA.toString(),
        },
        {
          token: {
            address: this.toTokenId(pool.assetB.currencySymbol, pool.assetB.tokenName),
          },
          totalSupplied: pool.reserveB.toString(),
        },
      ],
    };
  }

  private toTokenId(policyId: string, symbol: string) {
    return `${policyId}.${symbol}`;
  }
}
