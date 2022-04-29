import { FeatureEnum } from '@app/common';

import { IPartialBaseFeature } from './feature.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from './tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from './tokens.supplied.interface';

export interface IStakingFeatureEntryGeneric<TSupplied, TRewarded> extends IPartialBaseFeature {
  feature: FeatureEnum.staking;
  supplied: TSupplied[];
  rewarded: TRewarded[];
}
// raw web3 minimal data (tokens are just an address, numbers are stringified BigNumber)
export type IStakingFeatureMinimal = IStakingFeatureEntryGeneric<
  ISupplyTokenMinimal,
  IRewardTokenMinimal
>;

// User-less opportunities (getOpportunities)
export type IStakingFeatureOpportunity = IStakingFeatureEntryGeneric<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity
>;

// User Info (getUserPositions)
export type IStakingFeatureUserEntry = IStakingFeatureEntryGeneric<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry
>;
