import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
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

export interface IveYETIStakingPoolMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string;
  context: {
    stakedToken: Address;
    veYETIEmissions: Address;
  };
}

type IStakingFeatureMinimalSingle = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  void
>;

type IStakingFeatureOpportunitySingle = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  void
>;

type IStakingFeatureUserEntrySingle = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  void
>;

export class veYETIStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimalSingle,
    IStakingFeatureOpportunitySingle,
    IStakingFeatureUserEntrySingle,
    IveYETIStakingPoolMeta
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
  ) {
    super();
    if (this.updateFunctionPredicates) {
      this.updateFunctionPredicates();
    }
  }

  protected updateFunctionPredicates?(): void;

  protected functionPredicates: INamedFunctionPredicates = {
    balanceOf: () => (item) => item.name === 'getTotalYeti',
    totalSupply: () => (item) => item.name === 'totalYeti',
  };

  protected emissionsFunctions: INamedFunctionPredicates = {
    earned: () => (item) => item.name === 'earned',
  };

  /**
   * fetches all available pools on this protocol
   *
   * @param context hardcoded data & some multicall/web3 data
   * @returns full pools array
   */
  protected async fetchOpportunityData(
    context: Record<string, any>,
  ): Promise<IStakingFeatureMinimalSingle[]> {
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
      },
    ];
  }

  protected balanceOfLabel(address: Address, user: Address) {
    return `${address}.balanceOf(${user})`;
  }

  protected pendingRewardsLabel(address: Address, user: Address): string {
    return `${address}.pendingRewards(${user})`;
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunitySingle[],
  ): Promise<IStakingFeatureUserEntrySingle[]> {
    const contract = this.getMainContract();
    const veYETIEmissions = new DynamicContract(this.meta.context.veYETIEmissions);
    const emissionsFunctions = await this.abiService.parseFunctionsFromAddress(
      this.meta.context.veYETIEmissions,
      this.meta.chain,
      this.emissionsFunctions,
    );

    const calls = new Map();
    pools.forEach((pool) => {
      calls.set(
        this.balanceOfLabel(pool.id, address),
        contract.createCall(this.functions.balanceOf, address),
      );
      calls.set(
        this.pendingRewardsLabel(pool.id, address),
        veYETIEmissions.createCall(emissionsFunctions.earned, address),
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

    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(pool.id, address));
    // TODO: Object.values(userInfo) and find index instead of assuming .amount ?
    const balance = normalizeDecimals(balanceRaw.toString(), pool.supply.token.decimals);

    if (!balance) return;

    const rewardBalance = normalizeDecimals(pendingRewards.toString(), pool.reward.token.decimals);

    Object.assign(pool.supply, {
      amount: balance,
      value: balance * pool.supply.token.price,
    });

    Object.assign(pool.reward, {
      amount: rewardBalance,
      value: rewardBalance * pool.reward.token.price,
    });

    // TODO: what is the best way to extend the opportunity type to become a userEntry type
    // without forcing a cast like this (only a few fields are added amount, value)
    return pool as IStakingFeatureUserEntrySingle;
  }
}
