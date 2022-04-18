import { LCDClient } from '@terra-money/terra.js';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountBalance, Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { aprToApy, apyToApr, normalizeDecimals } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { TerraCore } from '../../TerraCore';

interface ILidoMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
}

export class LidoStaking
  extends TerraCore<IStakingFeatureMinimal, IStakingFeatureOpportunity, IStakingFeatureUserEntry>
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected web3Service: Web3ProviderService,
  ) {
    super();
  }

  meta: ILidoMeta;
  async initialize(): Promise<void> {
    //
  }

  async getCacheableOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.context.stLuna,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: this.meta.context.stakedToken },
            totalSupplied: '0', // calculated ofter we get the tokens //tokens.get(this.meta.address).totalSupply * exchangeRate,
          },
        ],
        rewarded: [
          {
            token: { address: this.meta.context.stakedToken }, // ust is compounded
            rewardPerSecond: '0', // calculated after we get tokens price
          },
        ],
      },
      {
        id: this.meta.context.bLuna,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: this.meta.context.stakedToken },
            totalSupplied: '0', // calculated ofter we get the tokens //tokens.get(this.meta.address).totalSupply * exchangeRate,
          },
        ],
        rewarded: [
          {
            token: { address: this.meta.context.rewardToken },
            rewardPerSecond: '0', // calculated after we get tokens price
          },
        ],
      },
    ];
  }

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimal[],
  ): Promise<IStakingFeatureMinimal[]> {
    const { data } = await firstValueFrom(this.httpService.get(`https://terra.lido.fi/api/stats`));

    const web3: LCDClient = await this.web3Service.getInstanceByChainId(ChainIdEnum.terra);

    const state: any = await web3.wasm.contractQuery(this.meta.address, {
      // eslint-disable-next-line camelcase
      state: {},
    });

    const stLunaTokenInfo: any = await web3.wasm.contractQuery(this.meta.context.stLuna, {
      // eslint-disable-next-line camelcase
      token_info: {},
    });
    const bLunaTokenInfo: any = await web3.wasm.contractQuery(this.meta.context.bLuna, {
      // eslint-disable-next-line camelcase
      token_info: {},
    });

    opportunities[0].meta = {
      apr: Number(data.bluna) / 100,
      apy: Number(data.stluna) / 100,
      totalSupplied: normalizeDecimals(state.total_bond_stluna_amount, stLunaTokenInfo.decimals),
      exchangeRate: state.stluna_exchange_rate,
    };
    opportunities[1].meta = {
      apr: Number(data.bluna) / 100,
      totalSupplied: normalizeDecimals(state.total_bond_bluna_amount, bLunaTokenInfo.decimals),
      exchangeRate: state.bluna_exchange_rate,
    };

    return opportunities;
  }

  protected formatOpportunity(
    opportunity: IStakingFeatureMinimal,
    tokens: Map<string, any>,
  ): void | IStakingFeatureOpportunity {
    const token = tokens.get(opportunity.supplied[0].token.address);
    const reward = tokens.get(opportunity.rewarded[0].token.address);

    const tvl = opportunity.meta.totalSupplied * token.price;
    const apr = this.getAprBreakdown(opportunity.meta.apr);
    const apy = opportunity.meta.apy ? this.getApyBreakdown(opportunity.meta.apy) : apr;

    return {
      id: opportunity.id,
      chain: opportunity.chain,
      feature: opportunity.feature,
      meta: opportunity.meta,
      supplied: [
        {
          token: token,
          tvl,
          totalSupplied: opportunity.meta.totalSupplied,
        },
      ],
      rewarded: [
        {
          token: reward,
          apr: apr,
          apy: apy, // apy is effectively the same as we can't compound
          harvests: {
            day: (apr.day * tvl) / reward.price,
            week: (apr.week * tvl) / reward.price,
            month: (apr.month * tvl) / reward.price,
            year: (apr.year * tvl) / reward.price,
          },
        },
      ],
    };
  }

  private getAprBreakdown(apr: number) {
    return {
      day: apr / 365,
      week: apr / 52,
      month: apr / 12,
      year: apr,
    };
  }
  private getApyBreakdown(apy: number) {
    const apr = apyToApr(apy, 365); // assuming compounds daily
    const breakdown = this.getAprBreakdown(apr);
    return {
      day: aprToApy(breakdown.day, 1),
      week: aprToApy(breakdown.week, 7),
      month: aprToApy(breakdown.month, 365 / 12),
      year: apy,
    };
  }

  async getUsersData(
    addresses: string[],
  ): Promise<[Map<string, IStakingFeatureUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();

    const balances = await this.accountService.getBalances(
      addresses,
      [this.meta.chain],
      [this.meta.context.stLuna, this.meta.context.bLuna],
    );

    let rewardError;

    let bLunaRewardsResult;

    try {
      bLunaRewardsResult = await this.getBLunaRewards(addresses);
    } catch (e) {
      rewardError = new Error('Could not update bluna rewards');
    }

    const rewards = new Map(!rewardError ? bLunaRewardsResult.map((a: any) => [a.address, a]) : []);

    const results = new Map<Address, IStakingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as IStakingFeatureUserEntry[]]),
    );

    addresses.forEach((address) => {
      pools.forEach((pool) => {
        const userPool = this.formatUserData(
          address,
          pool,
          balances[address],
          rewards.get(address),
        );
        if (userPool) {
          results.get(address).push(userPool);
        }
      });
    });

    return [results, rewardError ? [...errors, rewardError] : errors];
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    balance: AccountBalance,
    rewards: any,
  ) {
    const stakedBalance = balance.tokens.find((t) => t.token.address === pool.id);
    if (!stakedBalance.decimalsAmount) {
      return;
    }

    const clone = cloneDeep(pool);

    const amount = stakedBalance.decimalsAmount * pool.meta.exchangeRate;
    Object.assign(clone.supplied[0], {
      amount,
      value: amount * clone.supplied[0].token.price,
    });

    // only bluna gets rewards (stluna auto compounds)
    const rewardAmount =
      this.meta.context.bLuna === pool.id
        ? normalizeDecimals(rewards.balance, clone.rewarded[0].token.decimals)
        : 0;

    Object.assign(clone.rewarded[0], {
      amount: rewardAmount,
      value: rewardAmount * clone.rewarded[0].token.price,
    });

    return clone as IStakingFeatureUserEntry;
  }

  protected async getBLunaRewards(addresses: Address[]) {
    const web3: LCDClient = await this.web3Service.getInstanceByChainId(ChainIdEnum.terra);
    return Promise.all(
      addresses.map((address) =>
        web3.wasm.contractQuery(this.meta.context.reward, {
          holder: { address },
        }),
      ),
    );
  }
}
