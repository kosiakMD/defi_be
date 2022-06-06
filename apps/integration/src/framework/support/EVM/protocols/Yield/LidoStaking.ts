import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
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
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface ILidoEVMMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  address: Address;
  context: {
    stakedToken: Address;
    statsApi: string;
    statsProcessor: (data: any) => number;
  };
}

type IStakingFeatureMinimalSingle = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  { apr: number } | void
>;

// User-less opportunities (getOpportunities)
type IStakingFeatureOpportunitySingle = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  any
>;

// User Info (getUserPositions)
type IStakingFeatureUserEntrySingle = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  any
>;

export class LidoStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimalSingle,
    IStakingFeatureOpportunitySingle,
    IStakingFeatureUserEntrySingle,
    ILidoEVMMeta
  >
  implements IRootProtocol
{
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    balanceOf: () => (item) => item.name === 'balanceOf',
    totalSupply: () => (item) => item.name === 'totalSupply',
  };

  async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimalSingle[]> {
    // TODO: does this refresh enough?

    const { data } = await firstValueFrom(this.httpService.get(this.meta.context.statsApi));
    const apr = this.meta.context.statsProcessor(data);

    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.stakedToken },
          totalSupplied: context.totalSupply.toString(),
        },
        reward: {
          token: { address: context.stakedToken },
        },
        meta: { apr },
      },
    ];
  }

  protected formatOpportunity(
    opportunity: IStakingFeatureMinimalSingle,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunitySingle {
    const stakedToken = tokens.get(opportunity.supply.token.address);
    if (!stakedToken) return;
    const totalSupplied = normalizeDecimals(opportunity.supply.totalSupplied, stakedToken.decimals);
    const tvl = totalSupplied * stakedToken.price;

    const apr = {
      day: opportunity.meta.apr / 365,
      week: opportunity.meta.apr / 52,
      month: opportunity.meta.apr / 12,
      year: opportunity.meta.apr,
    };

    return {
      feature: opportunity.feature,
      id: opportunity.id,
      chain: opportunity.chain,
      supply: {
        token: stakedToken,
        totalSupplied,
        tvl,
      },
      reward: {
        token: stakedToken,
        apr: apr,
        apy: apr, // due to how the rewards work, compounding is impossible
        harvests: {
          day: (apr.day * tvl) / stakedToken.price,
          week: (apr.week * tvl) / stakedToken.price,
          month: (apr.month * tvl) / stakedToken.price,
          year: (apr.year * tvl) / stakedToken.price,
        },
      },
    };
  }

  protected balanceOfLabel(address: Address, user: Address) {
    return `${address}.balanceOf(${user})`;
  }

  /**
   * Fetch all required data for the users. Ideally a single multicall or subgraph request,
   * but the flexibility is here as long as a single object with all the required data is returned
   *
   * @param addresses user addresses
   * @param pools requested pools
   * @returns
   */
  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunitySingle[],
  ): Promise<IStakingFeatureUserEntrySingle[]> {
    const contract = this.getMainContract();

    const calls = new Map();
    pools.forEach((pool) => {
      calls.set(
        this.balanceOfLabel(pool.id, address),
        contract.createCall(this.functions.balanceOf, address),
      );
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunitySingle,
    data: any,
  ): IStakingFeatureUserEntrySingle {
    const {
      output: { data: balanceRaw },
    } = data.get(this.balanceOfLabel(pool.id, address));
    // TODO: Object.values(userInfo) and find index instead of assuming .amount ?
    const balance = normalizeDecimals(balanceRaw.toString(), pool.supply.token.decimals);

    if (!balance) return;

    // Update supplied token
    Object.assign(pool.supply, {
      amount: balance,
      value: balance * pool.supply.token.price,
    });

    // TODO: no rewards at this moment
    Object.assign(pool.reward, { amount: 0, value: 0 });

    // TODO: what is the best way to extend the opportunity type to become a userEntry type
    // without forcing a cast like this (only a few fields are added amount, value)
    return pool as IStakingFeatureUserEntrySingle;
  }
}
