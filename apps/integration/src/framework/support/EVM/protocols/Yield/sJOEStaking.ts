import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals, startsWith } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

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

export interface IsJOEStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  address: Address;
  context: {
    stakingToken: string;
    rewardToken: string;
  };
}

type IStakingFeatureMinimalSingle = BaseWithTokens<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  void,
  void
>;

// User-less opportunities (getOpportunities)
type IStakingFeatureOpportunitySingle = BaseWithTokens<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  void,
  void
>;

// User Info (getUserPositions)
type IStakingFeatureUserEntrySingle = BaseWithTokens<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  void,
  void
>;

export class sJOEStaking
  extends SingleContractProtocol<
    IStakingFeatureMinimalSingle,
    IStakingFeatureOpportunitySingle,
    IStakingFeatureUserEntrySingle,
    IsJOEStakingMeta
  >
  implements IRootProtocol
{
  protected fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunitySingle[],
  ): Promise<IStakingFeatureUserEntrySingle[]> {
    throw new Error('Method not implemented.');
  }

  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
    if (this.updateFunctionPredicates) {
      this.updateFunctionPredicates();
    }
  }

  protected updateFunctionPredicates?(): void;

  functionPredicates: INamedFunctionPredicates = {
    userInfo: () => (item) => startsWith(item.name, 'userInf'),
    pendingRewards: () => (item) => startsWith(item.name, 'pending'),
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
          token: { address: context.rewardToken },
        },
      },
    ];
  }

  //   protected balanceOfLabel(address: Address, user: Address) {
  //     return `${address}.balanceOf(${user})`;
  //   }

  //   protected pendingRewardsLabel(address: Address, user: Address): string {
  //     return `${address}.pendingRewards(${user})`;
  //   }

  //   protected async fetchUserData(
  //     address: string,
  //     pools: IStakingFeatureOpportunitySingle[],
  //   ): Promise<IStakingFeatureUserEntrySingle[]> {
  //     const contract = this.getMainContract();

  //     const calls = new Map();
  //     pools.forEach((pool) => {
  //       calls.set(
  //         this.balanceOfLabel(pool.id, address),
  //         contract.createCall(this.functions.balanceOf, address),
  //       );
  //       calls.set(
  //         this.pendingRewardsLabel(pool.id, address),
  //         contract.createCall(this.functions.pendingRewards, address),
  //       );
  //     });

  //     const results = await this.multicall.handleInBatches(calls, this.meta.chain);

  //     return pools.reduce((pools, pool) => {
  //       const userPool = this.formatUserData(address, pool, results);
  //       if (userPool) {
  //         pools.push(userPool);
  //       }

  //       return pools;
  //     }, []);
  //   }

  //   protected formatUserData(
  //     address: Address,
  //     pool: IStakingFeatureOpportunitySingle,
  //     data: any,
  //   ): IStakingFeatureUserEntrySingle {
  //     const {
  //       output: { data: balanceRaw },
  //     } = data.get(this.balanceOfLabel(pool.id, address));
  //     const {
  //       output: { data: rewardRaw },
  //     } = data.get(this.pendingRewardsLabel(pool.id, address));

  //     const balance = normalizeDecimals(balanceRaw.toString(), pool.supply.token.decimals);
  //     const reward = normalizeDecimals(rewardRaw.toString(), pool.supply.token.decimals);

  //     if (!balance) return;

  //     // Update supplied token
  //     Object.assign(pool.supply, {
  //       amount: balance,
  //       value: balance * pool.supply.token.price,
  //     });

  //     // TODO: no rewards at this moment
  //     Object.assign(pool.reward, {
  //       amount: reward,
  //       value: reward * pool.reward.token.price,
  //     });

  //     // TODO: what is the best way to extend the opportunity type to become a userEntry type
  //     // without forcing a cast like this (only a few fields are added amount, value)
  //     return pool as IStakingFeatureUserEntrySingle;
  //   }
}
