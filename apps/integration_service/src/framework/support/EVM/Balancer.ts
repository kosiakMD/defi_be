import { map, mergeMap, toArray, firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';

import { FeatureEnum } from '@app/common';

import { IProtocolMeta, IWalletMinimal, IWalletOpportunity, IWalletUserEntry } from '../interfaces';
import { ERC20Token } from '../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../interfaces/tokens.supplied.interface';
import { EVMCore } from './EVMCore';
import { IBalancerPoolsResponce, Pool, POOL_QUERY } from './Subgraphs/BalancerSubgraph';

type TMinimal = IWalletMinimal & { totalSupplied: string };
type TOpportunity = IWalletOpportunity & { totalSupplied: number };
type IBalancerVaultMeta = IProtocolMeta & { feature: FeatureEnum.pools | FeatureEnum.staking };

export abstract class Balancer extends EVMCore<TMinimal, TOpportunity, IWalletUserEntry> {
  protected abstract httpService: HttpService;
  protected baseURI = 'https://api.thegraph.com/subgraphs/name/balancer-labs/';
  meta: IBalancerVaultMeta;

  initialize(): Promise<void> {
    return void 0;
  }

  async getCacheableOpportunityData(): Promise<TMinimal[]> {
    const $data = this.httpService
      .post<IBalancerPoolsResponce>(this.baseURI + this.meta.context.key, {
        query: POOL_QUERY,
      })
      .pipe(
        mergeMap((responce) => responce.data.data.pools),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );

    return firstValueFrom($data);
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    return {
      token,
      totalSupplied: +poolToken.totalSupplied,
      tvl: +poolToken.totalSupplied * token.price,
    };
  }
  protected calculateBalances(
    poolsMap: Map<string, TOpportunity>,
    balances: { balance: string; address: string }[],
  ) {
    return balances.map((addressPool) => {
      if (!poolsMap.has(addressPool.address)) return [];
      const pool = poolsMap.get(addressPool.address);
      const decimalsAmount = +addressPool.balance;

      const poolShare = decimalsAmount / pool.totalSupplied;

      const supplied = pool.supplied.map((token: ISupplyTokenOpportunity) => {
        const balance = token.totalSupplied * poolShare;
        const result = {
          ...token,
          amount: balance,
          value: balance * token.token.price,
        };

        return result;
      });

      return { ...pool, supplied };
    });
  }

  protected formatOpportunity(opportunity: TMinimal, tokens: Map<string, any>): TOpportunity {
    if (opportunity.supplied.some((t) => !tokens.has(t.token.address))) {
      const message = `Failed to resolve some tokens for pool - ${opportunity.chain}/${opportunity.id}`;
      throw new Error(message);
    }
    return {
      id: opportunity.id,
      chain: opportunity.chain,
      feature: this.meta.feature,
      supplied: opportunity.supplied.map((poolToken) =>
        this.formatOpportunitySuppliedToken(poolToken, tokens.get(poolToken.token.address)),
      ),
      rewarded: [],
      totalSupplied: +opportunity.totalSupplied,
    };
  }

  private toFeatureEntryMinimal(pool: Pool): TMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      rewarded: [],
      totalSupplied: pool.totalShares,
      supplied: pool.tokens.map((token) => {
        return {
          token: { address: token.address },
          totalSupplied: token.balance,
          totalWeight: token.weight,
        };
      }),
    };
  }
}
