import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IProtocolMeta, IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature-pool.interface';
import { ERC20Token } from '../../../interfaces/tokens-common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens-supplied.interface';
import { EVMCore } from '../../eVMCore';
import {
  BALANCES_QUERY,
  IUniswapBalanceSubgraphResponse,
  POOLS_DATA_QUERY,
  POOLS_QUERY,
} from '../../subgraphs/uniswap-subgraph';

export type IUniswapVaultMeta = IProtocolMeta & {
  ammSubgraphUrl: string;
};

export class UniswapV2Liquidity
  extends EVMCore<IPoolFeatureMinimal, IPoolFeatureOpportunity, IPoolFeatureUser, IUniswapVaultMeta>
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    // only used to get totalSupply
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  /**
   * Get longer term cacheable info
   */
  async getCacheableOpportunityData(): Promise<IPoolFeatureMinimal[]> {
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

  private toFeatureEntryMinimal(pool): IPoolFeatureMinimal {
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
    opportunities: IPoolFeatureMinimal[],
  ): Promise<IPoolFeatureMinimal[]> {
    const $data = this.httpService
      .post(this.meta.ammSubgraphUrl, {
        query: POOLS_DATA_QUERY,
        variables: {
          pairs: opportunities.map((o) => o.id),
        },
      })
      .pipe(
        mergeMap((rsp) => rsp.data.data.pairs),
        toArray(),
      );
    const poolsArray = await firstValueFrom($data);

    const pools = new Map(poolsArray.map((p: any) => [p.address, p]));
    return opportunities.map((opportunity) => {
      const pool = pools.get(opportunity.id);
      const reserves = [pool.reserve0, pool.reserve1];
      return {
        ...opportunity,
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
    opportunity: IPoolFeatureMinimal,
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
      price: tvl / token.totalSupply,
    };
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    return {
      token,
      totalSupplied: Number(poolToken.totalSupplied),
      tvl: Number(poolToken.totalSupplied) * token.price,
    };
  }

  async getUsersData(addresses: string[]): Promise<IUserDataProtocolResponse<IPoolFeatureUser>> {
    const { data: pools, errors } = await this.getPoolData();
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

    return { data: wallets, errors };
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
    const poolShare = Number(balance.balance) / pool.token.totalSupply;

    const token = {
      ...pool.token,
      amount: Number(balance.balance),
      value: Number(balance.balance) * pool.token.price,
    };

    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      return {
        ...tokenSupplied,
        amount: poolShare * tokenSupplied.totalSupplied,
        value: tokenSupplied.token.price * poolShare * tokenSupplied.totalSupplied,
        token: {
          ...tokenSupplied.token,
        },
      };
    });

    return {
      ...pool,
      token: token,
      supplied,
    };
  }
}
