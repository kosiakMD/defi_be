import { BaseWithTokens } from './new.interfaces';
import './tokens-borrowed.interface';
import {
  IBorrowTokenMinimal,
  IBorrowTokenOpportunity,
  IBorrowTokenUserEntity,
} from './tokens-borrowed.interface';
import './tokens-rewarded.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from './tokens-rewarded.interface';
import './tokens-supplied.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from './tokens-supplied.interface';

export type ILendingFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  IBorrowTokenMinimal[]
>;
export type ILendingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity[],
  IBorrowTokenOpportunity[]
>;
export type ILendingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  IRewardTokenUserEntry[],
  IBorrowTokenUserEntity[]
> & { debtRatio: number };
