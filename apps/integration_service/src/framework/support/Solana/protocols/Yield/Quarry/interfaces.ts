import { FeatureEnum } from '../../../../enums';
import { IProtocolMeta } from '../../../../interfaces';
import { BaseWithTokens } from '../../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../../interfaces/tokens.supplied.interface';

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

// TODO: move IQuarryExtra into 'meta/extra' interface
export type IQuarryStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  any
> &
  IQuarryExtra;

export type IQuarryStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity[],
  void,
  any
> &
  IQuarryExtra;

export interface IQuarryMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  name: string;
  context: {
    endpoint: string;
  };
}

export interface IQuarryRedeemer {
  method: string;
  underlyingToken: string;
  underlyingTokenInfo: {
    address: string;
    extensions: {
      [x: string]: string;
    };
    logoURI: string;
  };
}
export interface IQuarryFarm {
  isReplica: boolean;
  primaryQuarries: IQuarryFarm[];
  quarry: string;
  replicaMint: string;
  replicaQuarries: IQuarryFarm[];
  stakedToken: {
    mint: string;
  };
  rewardsToken?: {
    mint: string;
  };
}

export interface IQuarryProtocol {
  info?: {
    redeemer?: IQuarryRedeemer;
  };
  quarries: IQuarryFarm[];
  rewardsToken: {
    mint: string;
  };
}

export interface IQuarryOpportunityResponse {
  [x: string]: IQuarryProtocol;
}
