import { normalizeDecimals } from '@app/common/utils';

import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { MasterChef } from './master-chef';

export class MasterChefMdex extends MasterChef {
  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const [masterchef, poolId] = pool.id.split('::');

    const {
      output: { data: userInfo },
    } = data.get(this.userInfoLabel(masterchef, poolId, address));

    // TODO: Object.values(userInfo) and find index instead of assuming .amount ?
    const balance = normalizeDecimals(
      userInfo[this.getUserInfoAmountKey()].toString(),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;
    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });
    // Update underlying assets
    if (pool.supplied[0].token.underlying?.length === 2) {
      const poolShare = balance / pool.supplied[0].token.totalSupply;
      pool.supplied[0].token.underlying.forEach((u) => {
        u.balance = u.reserve * poolShare;
        u.value = u.balance * u.price;
      });
    }

    const {
      output: { data: pendingRewards },
    } = data.get(this.pendingRewardsLabel(masterchef, poolId, address));

    const rewardBalance = normalizeDecimals(
      pendingRewards[0].toString(),
      pool.rewarded[0].token.decimals,
    );

    // Update Reward Token
    Object.assign(pool.rewarded[0], {
      amount: rewardBalance,
      value: rewardBalance * pool.rewarded[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }

  protected getYieldBreakdown() {
    return {
      apr: null,
      apy: null,
    };
  }
}
