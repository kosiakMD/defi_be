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

type ERC20TokenMinimal = {
  reserve: number;
  name: string;
  symbol: string;
  tvl?: number;
  totalSupplied?: number;
};

type TMinimal = IWalletMinimal & { token: ERC20TokenMinimal };
type TOpportunity = IWalletOpportunity & { token: ERC20TokenMinimal };
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
    return balances
      .map((addressPool) => {
        if (!poolsMap.has(addressPool.address)) return null;
        const pool = { ...poolsMap.get(addressPool.address) };
        const decimalsAmount = +addressPool.balance;

        const poolShare = decimalsAmount / pool.token.reserve;

        const underlyingTokens = pool.supplied;
        const lpPrice = underlyingTokens.reduce((prev, t) => t.tvl + prev, 0) / pool.token.reserve;
        // const lpPrice = lpTVL ;
        const supplied = [
          {
            token: {
              decimals: 18,
              address: addressPool.address,
              price: lpPrice,
              name: pool.token.name,
              symbol: pool.token.symbol,
              underlying: underlyingTokens.map((token: ISupplyTokenOpportunity) => {
                const balance = token.totalSupplied * poolShare;
                const result = {
                  ...token.token,
                  balance: balance,
                  value: balance * token.token.price,
                };
                return result;
              }),
            },
            totalSupplied: pool.token.reserve,
            tvl: pool.token.reserve * lpPrice,
            amount: decimalsAmount,
            value: decimalsAmount * lpPrice,
          },
        ];

        delete pool.token;

        return { ...pool, supplied };
      })
      .filter((pool) => pool !== null);
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
      token: opportunity.token,
      supplied: opportunity.supplied.map((poolToken) =>
        this.formatOpportunitySuppliedToken(poolToken, tokens.get(poolToken.token.address)),
      ),
      rewarded: [],
    };
  }

  private toFeatureEntryMinimal(pool: Pool): TMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      rewarded: [],
      token: {
        reserve: +pool.totalShares,
        name: pool.name,
        symbol: pool.symbol,
      },
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
