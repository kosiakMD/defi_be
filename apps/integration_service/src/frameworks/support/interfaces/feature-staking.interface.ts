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

// raw web3 minimal data (tokens are just an address, numbers are stringified BigNumber)
export type IStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  any
>;

// User-less opportunities (getOpportunities)
export type IStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity[],
  void,
  any
>;

// User Info (getUserPositions)
export type IStakingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  IRewardTokenUserEntry[],
  void,
  any
>;
