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

interface IPoolFeatureEntryGeneric<TSupplied, TRewarded = never> extends IPartialBaseFeature {
  feature: FeatureEnum.pools;
  supplied: TSupplied[];
  rewarded?: TRewarded[];
}
export type IPoolFeatureOpportunity = IPoolFeatureEntryGeneric<ISupplyTokenOpportunity>;
export type IPoolFeatureUser = IPoolFeatureEntryGeneric<ISupplyTokenUserEntry>;
export type IPoolFeatureEntryMinimal = IPoolFeatureEntryGeneric<
  ISupplyTokenMinimal,
  IRewardTokenMinimal
>;
export type IPoolFeatureEntryOpportunity = IPoolFeatureEntryGeneric<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity
>;
export type IPoolFeatureEntryUserEntry = IPoolFeatureEntryGeneric<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry
>;
