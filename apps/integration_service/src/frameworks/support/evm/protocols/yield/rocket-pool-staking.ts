import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservice/account.service';
import { PriceService } from '../../../../../modules/microservice/price.service';
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
} from '../../../interfaces/tokens-rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens-supplied.interface';
import { AbiService } from '../../abi-module/abi-service';
import { SingleContractProtocol } from '../../single-contract-protocol';

export interface IRocketPoolStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  address: Address;
  context: {
    sourceAPR: string;
    stakedToken: string;
  };
}

type IRocketExtra = {
  apr: number;
  exchangeRate: string;
};

type IStakingFeatureMinimalSingle = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  IRocketExtra
>;

type IStakingFeatureOpportunitySingle = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  { exchangeRate: number }
>;

type IStakingFeatureUserEntrySingle = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  any
>;

export class RocketPoolStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimalSingle,
    IStakingFeatureOpportunitySingle,
    IStakingFeatureUserEntrySingle,
    IRocketPoolStakingMeta
  >
  implements IRootProtocol
{
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
    exchangeRate: () => (item) => item.name === 'getExchangeRate',
  };

  protected async processStatsAPI(): Promise<number> {
    const lastKnownApr = 4.03;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<string>(this.meta.context.sourceAPR),
      );
      const apr = /(\bVITE_APR\b):"(\d+\.\d+)"/.exec(data)?.[2];
      return (Number(apr) || lastKnownApr) / 100;
    } catch (error) {
      this.logger.error('Can`t load APR from: ' + this.meta.context.sourceAPR);
      return lastKnownApr / 100;
    }
  }

  protected async fetchOpportunityData(
    context: Record<string, string>,
  ): Promise<IStakingFeatureMinimalSingle[]> {
    const apr = await this.processStatsAPI();

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
        meta: {
          apr,
          exchangeRate: context.exchangeRate.toString(),
        },
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
      meta: {
        exchangeRate: normalizeDecimals(opportunity.meta.exchangeRate, stakedToken.decimals),
      },
    };
  }

  protected balanceOfLabel(address: Address, user: Address) {
    return `${address}.balanceOf(${user})`;
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunitySingle,
    data: any,
  ): IStakingFeatureUserEntrySingle {
    const {
      output: { data: balanceRaw },
    } = data.get(this.balanceOfLabel(pool.id, address));

    const rETHBalance = normalizeDecimals(balanceRaw.toString(), pool.supply.token.decimals);

    if (!rETHBalance) return;
    const ETHBalance = rETHBalance * pool.meta.exchangeRate;

    // Update supplied token
    Object.assign(pool.supply, {
      amount: ETHBalance,
      value: ETHBalance * pool.supply.token.price,
    });

    // TODO: no rewards at this moment
    Object.assign(pool.reward, { amount: 0, value: 0 });

    // TODO: what is the best way to extend the opportunity type to become a userEntry type
    // without forcing a cast like this (only a few fields are added amount, value)
    return pool as IStakingFeatureUserEntrySingle;
  }
}
