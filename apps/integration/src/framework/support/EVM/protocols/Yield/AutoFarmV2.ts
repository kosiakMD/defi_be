import { BeefyAutofarmAssetService } from 'apps/integration/src/modules/microservices/beefy-autofarm.asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { IMasterChefPoolInfo, MasterChef } from './MasterChef';

export class AutoFarmV2 extends MasterChef {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: BeefyAutofarmAssetService,
  ) {
    super(abiService, multicall, logger, cache);
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: IMasterChefPoolInfo,
    totalStaked: string,
    context: { [key: string]: any },
  ): IStakingFeatureMinimal {
    const rewardShare = poolInfo.allocPoint / context.totalAllocPoint;

    const rewardPerSecond = new BigNumber(context.rewardPerSecond) //
      .times(rewardShare) // percentage of total reward for this pool
      .toString();

    return {
      id: `${this.meta.address}::${poolInfo.poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: poolInfo.stakedToken,
          },
          totalSupplied: totalStaked,
        },
      ],
      rewarded: [
        {
          token: { address: context.rewardToken },
          rewardPerSecond,
        },
      ],
    };
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const [masterchef, poolId] = pool.id.split('::');
    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    const balance = normalizeDecimals(userInfo[0].toString(), pool.supplied[0].token.decimals);

    if (!balance) return;
    // Update supplied token
    pool.supplied[0] = this.modifyUserEntrySupplied(pool.supplied[0], balance);
    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(masterchef, poolId, address));
    const rewardBalance = normalizeDecimals(
      pendingRewards.toString(),
      pool.rewarded[0].token.decimals,
    );
    // Update Reward Token
    Object.assign(pool.rewarded[0], {
      amount: rewardBalance,
      value: rewardBalance * pool.rewarded[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }
}
