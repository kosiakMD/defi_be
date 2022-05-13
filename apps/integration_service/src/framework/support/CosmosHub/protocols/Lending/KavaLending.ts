/* eslint-disable @typescript-eslint/no-unused-vars */
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
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from '../../../interfaces/feature.lending.interface';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from '../../../interfaces/tokens.borrowed.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import {
  UserLendingMap,
  IKavaMeta,
  IKavaRepositoryResponse,
  IKavaDenomAmount,
  IKavaLendingResponse,
  IncentiveParameterResponse,
  CDPParameterResponse,
} from '../interfaces/Kava/KavaLending';

export class KavaLending
  extends SingleContractProtocol<
    ILendingFeatureEntryMinimal,
    ILendingFeatureOpportunity,
    ILendingFeatureUserEntry,
    IKavaMeta
  >
  implements IRootProtocol
{
  SUPPLY_BORROW_REWARD: 'hard';
  KAVA_LENDING_KEY = 'kava_lending';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  get hardDepositedRepository(): string {
    return new URL('hard/total-deposited', this.meta.context.endpoint).toString();
  }

  get hardBorrowedRepository(): string {
    return new URL('hard/total-borrowed', this.meta.context.endpoint).toString();
  }

  get hardUserDeposited(): string {
    return new URL('hard/deposits', this.meta.context.endpoint).toString();
  }

  get hardUserBorrowed(): string {
    return new URL('hard/borrows', this.meta.context.endpoint).toString();
  }

  get incentiveParameter(): string {
    return new URL('incentive/parameters', this.meta.context.endpoint).toString();
  }

  get cdpParameter(): string {
    return new URL('cdp/parameters', this.meta.context.endpoint).toString();
  }

  protected async updateRealTimeData(
    opportunities: ILendingFeatureEntryMinimal[],
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const [collateralStats, collateralParams] = await Promise.all([
      this.getIncentiveParameter(),
      this.getCDPParameter(),
    ]);

    const collateralStatsMap = new Map(
      collateralStats.map((collateral) => [
        collateral.collateral_type,
        collateral.rewards_per_second,
      ]),
    );
    const collateralParamsMap = new Map(
      collateralParams.map((collateral) => [collateral.type, collateral]),
    );

    opportunities.forEach((opportunity) => {
      for (const [address, rewards] of collateralStatsMap.entries()) {
        opportunity.rewarded.push(
          ...rewards.map((reward) => {
            const result: IRewardTokenMinimal = {
              token: { address: reward.denom },
              rewardPerSecond: reward.amount,
              rewardedForTokenAddress: address,
              rewardedForLendingSide: 'supplied',
            };
            return result;
          }),
        );
      }

      opportunity.borrowed.forEach((token) => {
        const collateralKey = token.token.address + '-a';
        const collateral = collateralParamsMap.get(collateralKey);
        token.rate = { stabilityFee: collateral?.stability_fee || '0' };

        return token;
      });

      opportunity.supplied.forEach((token) => {
        const collateralKey = token.token.address + '-a';
        const collateral = collateralParamsMap.get(collateralKey);
        token.rate = { ltv: collateral?.liquidation_ratio || '0' };

        return token;
      });
    });

    return opportunities;
  }

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    const [deposited, borrowed] = await Promise.all([
      this.hardDepositedBorrowedList(this.hardDepositedRepository),
      this.hardDepositedBorrowedList(this.hardBorrowedRepository),
    ]);

    return this.toLendingFeatureEntryMinimal(deposited, borrowed);
  }

  protected async fetchUserData(addresses: string[]): Promise<UserLendingMap> {
    const result = await Promise.all([
      ...addresses.map((address) => this.userLendingRequest(address, this.hardUserDeposited)),
      ...addresses.map((address) => this.userLendingRequest(address, this.hardUserBorrowed)),
    ]);

    const userLendingMap: UserLendingMap = new Map();

    for (const lending of result.flat()) {
      const ownerType = 'depositor' in lending ? 'depositor' : 'borrower';

      if (!userLendingMap.has(lending[ownerType])) {
        userLendingMap.set(lending[ownerType], []);
      }
      if (ownerType === 'depositor') {
        userLendingMap.get(lending[ownerType]).push({ type: 'supplied', amount: lending.amount });
      } else {
        userLendingMap.get(lending[ownerType]).push({ type: 'borrowed', amount: lending.amount });
      }
    }

    return userLendingMap;
  }

  protected formatUserData(
    address: string,
    pools: ILendingFeatureOpportunity[],
    lendingMap: UserLendingMap,
  ): ILendingFeatureUserEntry[] {
    const result: ILendingFeatureUserEntry[] = [];
    const lending = lendingMap.get(address) || [];

    const pool = pools.find((x) => x.id === this.KAVA_LENDING_KEY);
    const supplied: ISupplyTokenUserEntry[] = [];
    const borrowed: IBorrowTokenUserEntity[] = [];
    const rewarded: IRewardTokenUserEntry[] = [];

    for (const userData of lending) {
      if (userData.type === 'supplied') {
        supplied.push(...this.mapSuppliedBorrowList(pool.supplied, userData.amount));
      } else {
        borrowed.push(...this.mapSuppliedBorrowList(pool.borrowed, userData.amount));
      }
    }

    /** TODO: WHAT IF LTV - ZERO */
    const suppliedUSD = supplied.reduce((prev, next) => prev + next.amount * next.ltv, 0);
    const borrowedUSD = borrowed.reduce((prev, next) => prev + next.amount, 0);

    for (const { token } of supplied) {
      const filteredRewards = this.filterRewardsBySuppliedToken(pool.rewarded, token);
      rewarded.push(...filteredRewards);
    }

    result.push({
      ...pool,
      supplied: supplied,
      borrowed: borrowed,
      rewarded: rewarded,
      debtRatio: suppliedUSD / borrowedUSD || 0,
    });

    return result;
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);
    const ltv = supplied.rate.ltv === '0' ? 0 : (1 / Number(supplied.rate.ltv)) * 100;
    return {
      token,
      tvl: totalSupplied * token.price,
      ltv,
    };
  }

  protected formatBorrowApy(borrowed: IBorrowTokenMinimal) {
    if (borrowed.rate.stabilityFee === '0') return 0;

    const borrowApy = Number(borrowed.rate.stabilityFee) ** 31536000 - 1;
    return new BN(borrowApy) //
      .times(100)
      .toNumber();
  }

  private async hardDepositedBorrowedList(link: string): Promise<IKavaDenomAmount[]> {
    const $data = this.httpService.get<IKavaRepositoryResponse>(link).pipe(
      mergeMap((response) => response.data.result),
      toArray(),
    );
    return firstValueFrom($data);
  }

  private filterRewardsBySuppliedToken(
    rewarded: IRewardTokenOpportunity[],
    token: ERC20Token,
  ): IRewardTokenUserEntry[] {
    return rewarded
      .filter(
        (r) =>
          r.rewardedForLendingSide === 'supplied' && r.rewardedForTokenAddress === token.address,
      )
      .map((r) => {
        return { ...r, amount: 0, value: 0 };
      });
  }

  private toLendingFeatureEntryMinimal(
    depositedPool: IKavaDenomAmount[],
    borrowedPool: IKavaDenomAmount[],
  ): ILendingFeatureEntryMinimal[] {
    const supplied: ISupplyTokenMinimal[] = depositedPool.map((x) => {
      return {
        token: { address: x.denom },
        totalSupplied: x.amount,
      };
    });

    const borrowed: IBorrowTokenMinimal[] = borrowedPool.map((x) => {
      return {
        token: { address: x.denom },
        totalBorrowed: x.amount,
      };
    });

    return [
      {
        id: this.KAVA_LENDING_KEY,
        ...this.meta,
        supplied,
        borrowed,
        rewarded: [],
      },
    ];
  }

  private async userLendingRequest(address: string, link: string) {
    const $data = this.httpService
      .get<IKavaLendingResponse>(link, { params: { owner: address } })
      .pipe(
        mergeMap((response) => response.data.result || []),
        toArray(),
      );
    return firstValueFrom($data);
  }

  private async getIncentiveParameter(): Promise<IncentiveParameterResponse[]> {
    return this.getOrSet(60 * 60 * 24, 'kava_incentive_parameter', async () => {
      const $data: any = this.httpService.get(this.incentiveParameter).pipe(
        mergeMap((response) => response.data.result.hard_supply_reward_periods),
        toArray(),
      );

      return firstValueFrom($data);
    });
  }

  private async getCDPParameter(): Promise<CDPParameterResponse[]> {
    return this.getOrSet(60 * 60 * 24, 'kava_cdp_parameter', async () => {
      const $data: any = this.httpService.get(this.cdpParameter).pipe(
        mergeMap((response) => response.data.result.collateral_params),
        toArray(),
      );

      return firstValueFrom($data);
    });
  }

  private mapSuppliedBorrowList(
    supplied: Array<ISupplyTokenOpportunity | IBorrowTokenOpportunity>,
    userData: IKavaDenomAmount[],
  ): Array<ISupplyTokenUserEntry | IBorrowTokenUserEntity> {
    const result: Array<ISupplyTokenUserEntry | IBorrowTokenUserEntity> = [];
    const suppliedMap = new Map(supplied.map((x) => [x.token.address, x]));
    for (const { amount, denom } of userData) {
      if (!suppliedMap.has(denom)) continue;
      const position = suppliedMap.get(denom);
      const balance = normalizeDecimals(amount, position.token.decimals);
      const balanceUSD = new BN(balance) //
        .times(position.token.price)
        .toNumber();
      result.push({
        ...position,
        amount: balance,
        value: balanceUSD,
      });
    }

    return result;
  }
}
