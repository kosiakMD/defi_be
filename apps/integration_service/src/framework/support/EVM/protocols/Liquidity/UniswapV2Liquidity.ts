import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { FeatureEnum, Logger } from '@app/common';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { RootProtocol } from '../../../RootProtocol';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import {
  BALANCES_QUERY,
  IUniswapBalanceSubgraphResponse,
  POOLS_QUERY,
} from '../../Subgraphs/UniswapSubgraph';

const LPDefault = {
  name: 'ApeSwapFinance LPs',
  symbol: 'APE-LP',
  decimals: 18,
  price: null,
};

export type IUniswapVaultMeta = IProtocolMeta & {
  ammSubgraphUrl: string;
};

export class UniswapV2Liquidity
  extends RootProtocol<
    IPoolFeatureOpportunity,
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

  async getCacheableOpportunityData(): Promise<IPoolFeatureOpportunity[]> {
    const $data = this.httpService
      .post(this.meta.ammSubgraphUrl, {
        query: POOLS_QUERY,
      })
      .pipe(
        mergeMap((rsp) => rsp.data.data.pairs),
        map((pool) => this.toFeatureEntryMinimal(pool)),
        toArray(),
      );
    return firstValueFrom($data);
  }

  private toFeatureEntryMinimal(pool): IPoolFeatureOpportunity {
    return {
      id: pool.id,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        {
          totalSupply: pool.totalSupply,
          totalSupplied: pool.totalSupply,
          tvl: Number(pool.reserveUSD),
          token: {
            ...LPDefault,
            address: pool.address,
            underlying: [
              {
                address: pool.token0.id,
                decimals: pool.token0.decimals,
                name: pool.token0.name,
                symbol: pool.token0.symbol,
                price: pool.reserveUSD / 2 / pool.reserve0,
                reserve: pool.reserve0,
                position: 0,
              },
              {
                address: pool.token1.id,
                decimals: pool.token1.decimals,
                name: pool.token1.name,
                symbol: pool.token1.symbol,
                price: pool.reserveUSD / 2 / pool.reserve1,
                reserve: pool.reserve1,
                position: 1,
              },
            ],
          },
        },
      ],
    };
  }

  protected async hydrateOpportunityData(
    opportunities: IPoolFeatureOpportunity[],
  ): Promise<[IPoolFeatureOpportunity[], Error[]]> {
    return [opportunities, []];
  }

  async getUsersData(addresses: string[]): Promise<[Map<string, IPoolFeatureUser[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    const wallets = new Map();
    const poolsMap = new Map(pools.map((p) => [p.id, p]));
    try {
      const balances = await this.getSubgraphAccountBalances(addresses);
      for (const balance of balances) {
        if (poolsMap.has(balance.pair)) {
          const data = this.calculateBalances(poolsMap.get(balance.pair), {
            balance: balance.balance,
            address: balance.user,
          });
          if (!wallets.has(balance.user)) {
            wallets.set(balance.user, []);
          }
          wallets.get(balance.user).push(data);
        }
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
    const userPool = cloneDeep(pool);
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
      ...userPool,
      supplied,
    };
  }

  initialize(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected formatOpportunity(opportunity: IPoolFeatureOpportunity): IPoolFeatureOpportunity {
    return opportunity;
  }
}
