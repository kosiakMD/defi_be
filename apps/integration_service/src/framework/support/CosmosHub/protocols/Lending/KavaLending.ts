/* eslint-disable @typescript-eslint/no-unused-vars */
import BN from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom, map, mergeMap, toArray } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IPoolDataProtocolResponse, IRootProtocol } from '../../../interfaces';
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
  IncentiveParametersResponse,
  InterestRateResponse,
  IHardParameterResponse,
} from '../interfaces/Kava/KavaLending';

type DenomInterestRate = [string, { borrowAPR: string; supplyAPR: string }];
type DenomLTV = [string, string];
type DenomRewardPerSecond = [string, IKavaDenomAmount[]];
type SupplyBorrowParams = {
  ltv: string;
  rewards: IKavaDenomAmount[];
  supplyAPR: string;
  borrowAPR: string;
};

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

  async getFormattedPoolData(): Promise<IPoolDataProtocolResponse<ILendingFeatureOpportunity>> {
    const { data: markets, errors } = await this.getPoolData();

    return {
      data: markets.flatMap((market) => {
        return [
          ...market.supplied.map((supplied) => {
            const rewarded = market.rewarded.filter(
              (r) =>
                r.rewardedForLendingSide === 'supplied' &&
                r.rewardedForTokenAddress === supplied.token.address,
            );
            return {
              ...market,
              id: `${market.id}::${supplied.token.address}`,
              supplied: [supplied],
              rewarded,
              borrowed: [],
            };
          }),
        ];
      }),
      errors,
    };
  }

  async getCacheableOpportunityData(): Promise<ILendingFeatureEntryMinimal[]> {
    const [deposited, borrowed] = await Promise.all([
      this.hardDepositedBorrowedList(this.hardDepositedRepository),
      this.hardDepositedBorrowedList(this.hardBorrowedRepository),
    ]);

    return this.toLendingFeatureEntryMinimal(deposited, borrowed);
  }

  protected async updateRealTimeData(
    opportunities: ILendingFeatureEntryMinimal[],
  ): Promise<ILendingFeatureEntryMinimal[]> {
    const TWO_HOUR_CACHE = 60 * 60 * 2;
    const realTimeData = await this.getOrSet(TWO_HOUR_CACHE, 'kava_real_time_data', async () =>
      this.supplyBorrowDenomParameters(opportunities),
    );
    const realTimeDataMap = new Map(realTimeData);

    opportunities.forEach((opportunity) => {
      opportunity.borrowed.forEach((token) => {
        const data = realTimeDataMap.get(token.token.address);
        token.rate = {
          borrowApy: data.borrowAPR,
        };

        return token;
      });

      opportunity.supplied.forEach((token) => {
        const address = token.token.address;
        const data = realTimeDataMap.get(token.token.address);
        token.rate = { supplyApy: data.supplyAPR };
        token.ltv = data.ltv;

        opportunity.rewarded.push(
          ...data.rewards.map((reward) => {
            const result: IRewardTokenMinimal = {
              token: { address: reward.denom },
              rewardPerSecond: reward.amount,
              rewardedForTokenAddress: address,
              rewardedForLendingSide: 'supplied',
            };
            return result;
          }),
        );

        return token;
      });
    });

    return opportunities;
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

    const suppliedUSD = supplied.reduce((prev, next) => prev + next.amount * next.ltv, 0);
    const borrowedUSD = borrowed.reduce((prev, next) => prev + next.amount, 0);

    result.push({
      ...pool,
      supplied: supplied,
      borrowed: borrowed,
      rewarded: [],
      debtRatio: suppliedUSD / borrowedUSD || 0,
    });

    return result;
  }

  protected formatOpportunitySuppliedToken(
    supplied: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    const totalSupplied = normalizeDecimals(supplied.totalSupplied, token.decimals);
    const variableApy = Number(supplied.rate.supplyApy) * 100;
    const ltv = Number(supplied.ltv);
    return {
      token,
      tvl: totalSupplied * token.price,
      apy: { variableApy },
      ltv,
    };
  }

  protected formatBorrowApy(borrowed: IBorrowTokenMinimal) {
    const borrowApy = Number(borrowed.rate.borrowApy) * 100;

    return { borrowApy };
  }

  private async hardDepositedBorrowedList(link: string): Promise<IKavaDenomAmount[]> {
    const $data = this.httpService.get<IKavaRepositoryResponse>(link).pipe(
      mergeMap((response) => response.data.result),
      toArray(),
    );
    return firstValueFrom($data);
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

  private async supplyBorrowDenomParameters(opportunities: ILendingFeatureEntryMinimal[]) {
    const [incentiveStats, hardParameter, interestRate] = await Promise.all([
      this.getIncentiveParameter(),
      this.getHardParameter(),
      this.getInterestRate(),
    ]);
    const suppliedDenomSet = new Set(
      opportunities.flatMap((o) => o.supplied.map((s) => s.token.address)),
    );

    const supplyBorrowMap: [string, SupplyBorrowParams][] = [];

    const incentiveStatsMap = new Map(incentiveStats);
    const hardParameterMap = new Map(hardParameter);
    const interestRateMap = new Map(interestRate);

    for (const denom of suppliedDenomSet.values()) {
      const rewards = incentiveStatsMap.get(denom);
      const ltv = hardParameterMap.get(denom);
      const rate = interestRateMap.get(denom);

      supplyBorrowMap.push([
        denom,
        {
          supplyAPR: rate.supplyAPR,
          borrowAPR: rate.borrowAPR,
          ltv: ltv,
          rewards: rewards,
        },
      ]);
    }
    return supplyBorrowMap;
  }

  /**
   * @return {Promise<DenomRewardPerSecond[]>} denom and reward per second for supplied position
   * */
  private async getIncentiveParameter(): Promise<DenomRewardPerSecond[]> {
    const $data = this.httpService.get<IncentiveParametersResponse>(this.incentiveParameter).pipe(
      mergeMap((response) => response.data.result.hard_supply_reward_periods),
      map((denom): DenomRewardPerSecond => [denom.collateral_type, denom.rewards_per_second]),
      toArray(),
    );

    return firstValueFrom($data);
  }

  /**
   * @return {Promise<DenomLTV[]>} denom key and LTV value
   * */
  private async getHardParameter(): Promise<DenomLTV[]> {
    const $data = this.httpService.get<IHardParameterResponse>(this.hardParameters).pipe(
      mergeMap((response) => response.data.result.money_markets),
      map((market): DenomLTV => [market.denom, market.borrow_limit.loan_to_value]),
      toArray(),
    );

    return firstValueFrom($data);
  }

  /**
   * @return {Promise<DenomInterestRate[]>} denom key and APR
   * */
  private async getInterestRate(): Promise<DenomInterestRate[]> {
    const $data = this.httpService.get<InterestRateResponse>(this.interestRate).pipe(
      mergeMap((response) => response.data.result),
      map((rate) => {
        return [
          rate.denom,
          {
            borrowAPR: rate.borrow_interest_rate,
            supplyAPR: rate.supply_interest_rate,
          },
        ] as DenomInterestRate;
      }),
      toArray(),
    );
    return firstValueFrom($data);
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

  private get hardDepositedRepository(): string {
    return new URL('hard/total-deposited', this.meta.context.endpoint).toString();
  }

  private get hardBorrowedRepository(): string {
    return new URL('hard/total-borrowed', this.meta.context.endpoint).toString();
  }

  private get hardUserDeposited(): string {
    return new URL('hard/deposits', this.meta.context.endpoint).toString();
  }

  private get hardUserBorrowed(): string {
    return new URL('hard/borrows', this.meta.context.endpoint).toString();
  }

  private get hardParameters(): string {
    return new URL('hard/parameters', this.meta.context.endpoint).toString();
  }

  private get incentiveParameter(): string {
    return new URL('incentive/parameters', this.meta.context.endpoint).toString();
  }

  private get interestRate(): string {
    return new URL('hard/interest-rate', this.meta.context.endpoint).toString();
  }
}
