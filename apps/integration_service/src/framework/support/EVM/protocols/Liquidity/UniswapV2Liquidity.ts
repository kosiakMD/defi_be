import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { RootProtocolCacheable } from '../../../RootProtocolCacheable';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureEntryMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import {
  BALANCES_QUERY,
  IUniswapBalanceSubgraphResponse,
  POOLS_QUERY,
} from '../../Subgraphs/UniswapSubgraph';

export type IUniswapVaultMeta = IProtocolMeta & {
  ammSubgraphUrl: string;
};

export class UniswapV2Liquidity
  extends RootProtocolCacheable<
    IPoolFeatureEntryMinimal,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    IUniswapVaultMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  /**
   * Get longer term cacheable info
   */
  async getCacheableOpportunityData(): Promise<IPoolFeatureEntryMinimal[]> {
    const $data = this.httpService
      .post(this.meta.ammSubgraphUrl, {
        query: POOLS_QUERY,
      })

      // console.log({ result: (await firstValueFrom($data)).data });
      .pipe(
        mergeMap((rsp) => rsp.data.data.pairs),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );
    return firstValueFrom($data);
  }

  private toFeatureEntryMinimal(pool): IPoolFeatureEntryMinimal {
    return {
      id: pool.address,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        { token: { address: pool.token0.address } },
        { token: { address: pool.token1.address } },
      ],
    };
  }

  protected async updateRealTimeData(
    opportunities: IPoolFeatureEntryMinimal[],
  ): Promise<IPoolFeatureEntryMinimal[]> {
    // TODO: cache for 5 minutes?
    const poolsArray = await this.getOrSet(60 * 60 * 24, 'ape-swap-pool-list-dev', () => {
      const $data = this.httpService
        .post(this.meta.ammSubgraphUrl, {
          query: POOLS_QUERY,
        })
        .pipe(
          mergeMap((rsp) => rsp.data.data.pairs),
          toArray(),
        );
      return firstValueFrom($data);
    });

    const pools = new Map(poolsArray.map((p: any) => [p.address, p]));
    return opportunities.map((opportunity) => {
      const pool = pools.get(opportunity.id);
      const reserves = [pool.reserve0, pool.reserve1];
      return {
        ...opportunity,
        token: {
          // TODO: Filled by asset service
          // address: '0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95',
          // name: 'ApeSwapFinance Banana',
          // symbol: 'BANANA',
          // chainId: 2,
          // decimals: 18,
          // price: 0.208363,
          totalSupply: Math.max(Number(pool.totalSupply), 0),
        },
        supplied: opportunity.supplied.map((supplied, idx) => {
          const totalSupplied = reserves[idx];
          return {
            token: supplied.token,
            totalSupplied,
          };
        }),
      };
    });
  }

  protected formatOpportunityReceiptToken(
    opportunity: IPoolFeatureEntryMinimal,
    token: ERC20Token,
    tokens: Map<Address, ERC20Token>,
  ) {
    if (!token) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { underlying, ...rest } = token;

    // TODO: totalSupply & price should come from asset service making this function unnecessary
    const tvl = opportunity.supplied.reduce(
      (total, cur) => total + Number(cur.totalSupplied) * tokens.get(cur.token.address).price,
      0,
    );

    return {
      ...opportunity.token, // merge in totalSupply
      ...rest,
      price: tvl / opportunity.token.totalSupply,
    };
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupply = normalizeDecimals(poolToken.totalSupply, token.decimals);
    return {
      token,
      totalSupply,
      totalSupplied: Number(poolToken.totalSupplied),
      tvl: Number(poolToken.totalSupplied) * token.price,
    };
  }

  async getUsersData(addresses: string[]): Promise<[Map<string, IPoolFeatureUser[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    const wallets = new Map();
    const poolsMap = new Map(pools.map((p) => [p.id, p]));
    try {
      // TODO: pass poolsMap.keys to only check balances for these pools?
      const balances = await this.getSubgraphAccountBalances(addresses);
      for (const balance of balances) {
        if (!poolsMap.has(balance.pair)) {
          continue;
        }

        const data = this.calculateBalances(poolsMap.get(balance.pair), {
          balance: balance.balance,
          address: balance.user,
        });

        if (!wallets.has(balance.user)) {
          wallets.set(balance.user, []);
        }
        wallets.get(balance.user).push(data);
      }
    } catch (err) {
      errors.push(err);
    }

    return [wallets, errors];
  }

  private async getSubgraphAccountBalances(addresses: string[]) {
    const $data = this.httpService
      .post<IUniswapBalanceSubgraphResponse>(this.meta.ammSubgraphUrl, {
        query: BALANCES_QUERY,
        variables: { addresses },
      })
      .pipe(
        mergeMap((rsp) => rsp.data.data.balances),
        map((b) => {
          const [pair, user] = b.id.split('-');
          return {
            pair,
            user,
            balance: b.balance,
          };
        }),
        toArray(),
      );

    return firstValueFrom($data);
  }

  protected calculateBalances(
    pool: IPoolFeatureOpportunity,
    balance: { balance: string; address: string },
  ): IPoolFeatureUser {
    const lpTokenPrice = pool.supplied[0].tvl / pool.supplied[0].totalSupply;
    const poolShare = Number(balance.balance) / pool.supplied[0].totalSupply;

    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      return {
        ...tokenSupplied,
        totalSupply: tokenSupplied.totalSupply,
        amount: Number(balance.balance),
        value: lpTokenPrice * Number(balance.balance),
        token: {
          ...tokenSupplied.token,
          price: lpTokenPrice,
          underlying: tokenSupplied.token.underlying.map((token: ERC20Token) => {
            const balance = poolShare * token.reserve;
            return {
              ...token,
              balance: poolShare * token.reserve,
              value: balance * token.price,
            };
          }),
        },
      };
    });

    return {
      ...pool,
      supplied,
    };
  }
}
