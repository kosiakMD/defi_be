import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import {
  INamedFunctionPredicates,
  IProtocolMeta,
  IRootProtocol,
  TokenMap,
} from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
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

export class LidoStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
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

  async fetchOpportunityData(context: { [key: string]: any }): Promise<IStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: context.stakedToken },
            totalSupplied: context.totalSupply.toString(),
          },
        ],
        rewarded: [
          {
            token: { address: context.stakedToken },
            rewardPerSecond: '0', // will be filled in by realTimeData from Lido API
          },
        ],
      },
    ];
  }

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimal[],
  ): Promise<IStakingFeatureMinimal[]> {
    const { data } = await firstValueFrom(this.httpService.get(this.meta.context.statsApi));
    const apr = this.meta.context.statsProcessor(data);
    opportunities[0].meta = {
      apr: apr,
    };

    return opportunities;
  }

  protected formatOpportunity(
    opportunity: IStakingFeatureMinimal,
    tokens: TokenMap,
  ): void | IStakingFeatureOpportunity {
    const stakedToken = tokens.get(opportunity.supplied[0].token.address);
    if (!stakedToken) return;
    const totalSupplied = normalizeDecimals(
      opportunity.supplied[0].totalSupplied,
      stakedToken.decimals,
    );
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
      supplied: [
        {
          token: stakedToken,
          totalSupplied,
          tvl,
        },
      ],
      rewarded: [
        {
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
      ],
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
  protected fetchUserData(addresses: Address[], pools: IStakingFeatureOpportunity[]) {
    const contract = this.getMainContract();

    const calls = new Map();
    addresses.forEach((address) => {
      return pools.forEach((pool) => {
        calls.set(
          this.balanceOfLabel(pool.id, address),
          contract.createCall(this.functions.balanceOf, address),
        );
      });
    });

    return this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const {
      output: { data: balanceRaw },
    } = data.get(this.balanceOfLabel(pool.id, address));

    // TODO: Object.values(userInfo) and find index instead of assuming .amount ?
    const balance = normalizeDecimals(balanceRaw.toString(), pool.supplied[0].token.decimals);

    if (!balance) return;

    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    // TODO: no rewards at this moment
    Object.assign(pool.rewarded[0], { amount: 0, value: 0 });

    // TODO: what is the best way to extend the opportunity type to become a userEntry type
    // without forcing a cast like this (only a few fields are added amount, value)
    return pool as IStakingFeatureUserEntry;
  }
}
