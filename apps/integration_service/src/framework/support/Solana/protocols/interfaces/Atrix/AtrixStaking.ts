import { FeatureEnum } from '@app/common';

import { IProtocolMeta } from '../../../../interfaces';
import { BaseWithTokens } from '../../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../../interfaces/tokens.supplied.interface';

export interface IAtrixSolanaMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: {
    endpoint: string;
    programID: string;
  };
}

export interface IAtrixRewardTokenMinimal extends IRewardTokenMinimal {
  rewardOwner: string;
}

export interface IAtrixRewardTokenOpportunity extends IRewardTokenOpportunity {
  rewardOwner: string;
}

export type IAtrixRewardTokenEntry = IRewardTokenUserEntry;

export type IAtrixStakingMinimal = BaseWithTokens<
  ISupplyTokenMinimal,
  IAtrixRewardTokenMinimal[],
  void,
  any
>;

export type IAtrixStakingOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity,
  IAtrixRewardTokenOpportunity[],
  void,
  any
>;
export type IAtrixStakingUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry,
  IAtrixRewardTokenEntry[],
  void,
  any
>;
