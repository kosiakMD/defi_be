import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import {
  IKavaMeta,
  IKavaPool,
  IKavaLiquidityRepositoryResponse,
  IKavaLiquidityDepositsResponse,
  IKavaPoolFeatureEntryMinimal,
  IKavaSupplyTokenMinimal,
  IKavaDeposits,
} from '../interfaces/Kava/KavaLiquidity';

export class KavaLiquidity
  extends SingleContractProtocol<
    IKavaPoolFeatureEntryMinimal,
    IPoolFeatureEntryOpportunity,
    IPoolFeatureEntryUserEntry,
    IKavaMeta
  >
  implements IRootProtocol
{
  LIQUIDITY_DECIMALS = 6;
  REWARDED_ADDRESS = 'swp';

  initialize(): Promise<void> {
    return;
  }

  get liquidityRepository(): string {
    return new URL('/kava/swap/v1beta1/pools', this.meta.context.endpoint).toString();
  }

  get liquidityDeposits(): string {
    return new URL('/kava/swap/v1beta1/deposits', this.meta.context.endpoint).toString();
  }

  get incentiveParameter(): string {
    return new URL('/incentive/parameters', this.meta.context.endpoint).toString();
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  protected async updateRealTimeData(
    opportunities: IKavaPoolFeatureEntryMinimal[],
  ): Promise<IKavaPoolFeatureEntryMinimal[]> {
    const stats: any[] = await firstValueFrom(
      this.httpService.get(this.incentiveParameter).pipe(
        mergeMap((response) => response.data.result.swap_reward_periods),
        toArray(),
      ),
    );

    const statsMap = new Map(
      stats.map((collateral) => [
        collateral.collateral_type,
        collateral.rewards_per_second[0].amount,
      ]),
    );

    opportunities.forEach((opportunity) => {
      const rewardPerSecond = statsMap.get(opportunity.id);
      opportunity.rewarded[0].rewardPerSecond = rewardPerSecond || 0;
    });

    return opportunities;
  }

  async getCacheableOpportunityData(): Promise<IKavaPoolFeatureEntryMinimal[]> {
    const $data = this.httpService
      .get<IKavaLiquidityRepositoryResponse>(this.liquidityRepository)
      .pipe(
        mergeMap((response) => response.data.pools),
        toArray(),
      );
    const pools = await firstValueFrom($data);

    await Promise.all(pools.map((pool) => this.saveAssetsAndUnderlying(pool)));

    return pools.map((pool) => this.toFeatureEntryMinimal(pool));
  }

  protected async fetchUserData(addresses: string[]): Promise<Map<string, IKavaDeposits[]>> {
    const deposits = await Promise.all(
      addresses.map((address) => this.accountLiquidityDeposits(address)),
    );
    const depositMap = new Map();

    for (const deposit of deposits.flat()) {
      if (!depositMap.has(deposit.depositor)) {
        depositMap.set(deposit.depositor, []);
      }
      depositMap.get(deposit.depositor).push(deposit);
    }

    return depositMap;
  }

  protected formatUserData(
    address: string,
    pools: IPoolFeatureEntryOpportunity[],
    deposits: Map<string, IKavaDeposits[]>,
  ): IPoolFeatureEntryUserEntry[] {
    const result: IPoolFeatureEntryUserEntry[] = deposits.get(address)?.map((deposit) => {
      const pool = pools.find((x) => x.id === deposit.pool_id);
      if (!pool) return;
      const clone = cloneDeep(pool);

      const amount = normalizeDecimals(deposit.shares_owned, clone.supplied[0].token.decimals);
      const amountUSDValue = new BN(amount) //
        .times(pool.supplied[0].token.price)
        .toNumber();

      clone.supplied[0].token.underlying.forEach((token) => {
        const coin = deposit.shares_value.find((coin) => coin.denom === token.address);
        if (!coin) return token;
        token.balance = normalizeDecimals(coin.amount, token.decimals);
        token.value = new BN(token.balance) //
          .times(token.price)
          .toNumber();
        return token;
      });

      const supplied: ISupplyTokenUserEntry[] = [
        {
          ...clone.supplied[0],
          amount: amount,
          value: amountUSDValue,
        },
      ];

      const rewarded: IRewardTokenUserEntry[] = clone.rewarded.map((reward) => {
        return {
          ...reward,
          value: 0,
          amount: 0,
        };
      });

      return { ...clone, supplied, rewarded };
    });

    return result || [];
  }

  protected formatOpportunitySuppliedToken(
    poolToken: IKavaSupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(poolToken.totalSupplied, 6);

    const tvl = poolToken.token.underlying.reduce((prev, next) => {
      const underlying = token.underlying.find((token) => token.address === next.address);
      return new BN(normalizeDecimals(next.totalSupplied, underlying.decimals)) //
        .times(underlying.price)
        .plus(prev);
    }, new BN(0));

    token.price = tvl.div(totalSupplied).toNumber();
    token.underlying.forEach((token) => {
      const { totalSupplied } = poolToken.token.underlying.find((t) => t.address === token.address);
      token.reserve = normalizeDecimals(totalSupplied, token.decimals);
      return token;
    });

    return {
      tvl: tvl.toNumber(),
      token,
      totalSupplied,
    };
  }

  private accountLiquidityDeposits(address: string) {
    const $data = this.httpService
      .get<IKavaLiquidityDepositsResponse>(this.liquidityDeposits, {
        params: { owner: address },
      })
      .pipe(
        mergeMap((response) => response.data.deposits),
        toArray(),
      );
    return firstValueFrom($data);
  }

  private toFeatureEntryMinimal(pool: IKavaPool): IKavaPoolFeatureEntryMinimal {
    return {
      id: pool.name,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: pool.name,
            underlying: pool.coins.map((coin) => {
              return {
                address: coin.denom,
                totalSupplied: coin.amount,
              };
            }),
          },
          totalSupplied: pool.total_shares,
        },
      ],
      rewarded: [
        {
          token: { address: this.REWARDED_ADDRESS },
          rewardPerSecond: '0',
        },
      ],
    };
  }

  private saveAssetsAndUnderlying(pool: IKavaPool) {
    return this.accountService.saveAssetsAndUnderlying({
      address: pool.name,
      name: pool.name,
      symbol: pool.name,
      decimals: this.LIQUIDITY_DECIMALS,
      isLp: true,
      chainId: this.meta.chain,
    });
  }
}
