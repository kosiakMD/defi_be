import { FeatureEnum } from '@app/common';

import { IProtocolMeta } from '../../../../interfaces';
import { IStakingFeatureEntryGeneric } from '../../../../interfaces/feature.staking.interface';
import { ERC20TokenMinimal } from '../../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../../interfaces/tokens.supplied.interface';

export interface IQuarrySupplyTokenMinimal extends ISupplyTokenMinimal {
  token: ERC20TokenMinimal & {
    underlying: {
      address: string;
      reserveAddress?: string;
      reserve?: number;
      price?: number;
    }[];
  };
}

export interface IQuarryExtra {
  replicaMint: string;
  extra?: {
    isParent?: boolean;
    famineTs?: string;
    lastUpdateTs?: string;
    annualRewardsRate?: string;
    rewardsPerTokenStored?: string;
    totalTokensDeposited?: string;
  };
}

export interface IQuarryStakingFeatureMinimal
  extends IStakingFeatureEntryGeneric<IQuarrySupplyTokenMinimal, IRewardTokenMinimal>,
    IQuarryExtra {}

export interface IQuarryStakingFeatureOpportunity
  extends IStakingFeatureEntryGeneric<ISupplyTokenOpportunity, IRewardTokenOpportunity>,
    IQuarryExtra {}

export interface IQuarryMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  api: {
    endpoint: string;
  };
}

export interface IQuarryOpportunityResponse {
  isParent: boolean;
  address: string;
  stakedToken: string;
  assets: {
    address: string;
    reserveAddress?: string;
  }[];
  rewardAssets: string[];
  replicaMint: string;
}
