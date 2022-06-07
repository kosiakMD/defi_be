import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom, mergeMap, toArray } from 'rxjs';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
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
import { IRewardTokenUserEntry } from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import {
  IKavaDeposits,
  IKavaLiquidityDepositsResponse,
  IKavaLiquidityRepositoryResponse,
  IKavaMeta,
  IKavaPool,
  IKavaPoolFeatureEntryMinimal,
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

      const amount = normalizeDecimals(deposit.shares_owned, clone.token.decimals);
      clone.token.amount = amount;
      clone.token.value = new BN(amount) //
        .times(clone.token.price)
        .toNumber();

      const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
        const coin = deposit.shares_value.find(
          (coin) => coin.denom === tokenSupplied.token.address,
        );
        return {
          tvl: tokenSupplied.tvl,
          amount: normalizeDecimals(coin.amount, tokenSupplied.token.decimals),
          value:
            normalizeDecimals(coin.amount, tokenSupplied.token.decimals) *
            tokenSupplied.token.price,
          token: {
            ...tokenSupplied.token,
          },
        };
      });

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
      token: {
        address: pool.name,
        totalSupply: pool.total_shares,
        totalSupplied: pool.total_shares,
      },
      supplied: pool.coins.map((coin) => {
        return {
          token: {
            address: coin.denom,
          },
          totalSupplied: coin.amount,
        };
      }),
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
