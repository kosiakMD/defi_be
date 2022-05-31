import { BaseWithTokens } from './new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from './tokens-rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from './tokens-supplied.interface';

export type IPoolFeatureMinimal = BaseWithTokens<ISupplyTokenMinimal[], void, void>;
export type IPoolFeatureOpportunity = BaseWithTokens<ISupplyTokenOpportunity[], void, void>;
export type IPoolFeatureUser = BaseWithTokens<ISupplyTokenUserEntry[], void, void>;

export type IPoolFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void
>;
export type IPoolFeatureEntryOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity[],
  void
>;
export type IPoolFeatureEntryUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  IRewardTokenUserEntry[],
  void
>;
