import { Address } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';

import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { CakeVault } from './CakeVault';

interface IMojitoVaultContext {
  poolId: number;
  masterchef?: Address;
  totalStaked?: string;
  stakedToken?: Address;
  rewardToken?: Address;
}

export class MojitoVault extends CakeVault {
  protected async fetchOpportunityData(
    context: IMojitoVaultContext,
  ): Promise<IStakingFeatureMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: { address: context.stakedToken },
            totalSupplied: context.totalStaked,
          },
        ],
        rewarded: [
          {
            token: { address: context.rewardToken },
          },
        ],
      },
    ];
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const {
      output: { data: userInfo },
    } = data.get(`${pool.id}.balanceOf(${address})`);

    let pricePerShare = data.get(this.functions.pricePerShare.name);
    pricePerShare = normalizeDecimals(pricePerShare.output.data, pool.supplied[0].token.decimals);

    const balance = normalizeDecimals(
      userInfo.shares.times(pricePerShare),
      pool.supplied[0].token.decimals,
    );

    if (!balance) return;

    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    // Auto Compounding, will assume 0 here
    Object.assign(pool.rewarded[0], { amount: 0, value: 0 });

    return pool as IStakingFeatureUserEntry;
  }
}
