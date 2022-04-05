import { FeatureEnum } from '@app/common';

import { IPartialBaseFeature } from './feature.common.interface';
import './tokens.borrowed.interface';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from './tokens.borrowed.interface';
import './tokens.rewarded.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from './tokens.rewarded.interface';
import './tokens.supplied.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from './tokens.supplied.interface';

interface ILendingFeatureEntryGeneric<TSupplied, TRewarded, TBorrowed> extends IPartialBaseFeature {
  feature: FeatureEnum.lending;
  supplied: TSupplied[];
  rewarded: TRewarded[];
  borrowed: TBorrowed[];
  debtRatio: number;
}

export type ILendingFeatureEntryMinimal = ILendingFeatureEntryGeneric<
  ISupplyTokenMinimal,
  IRewardTokenMinimal,
  IBorrowTokenMinimal
>;
export type ILendingFeatureOpportunity = ILendingFeatureEntryGeneric<
  ISupplyTokenOpportunity,
  IRewardTokenOpportunity,
  IBorrowTokenOpportunity
>;
export type ILendingFeatureUserEntry = ILendingFeatureEntryGeneric<
  ISupplyTokenUserEntry,
  IRewardTokenUserEntry,
  IBorrowTokenUserEntity
>;
