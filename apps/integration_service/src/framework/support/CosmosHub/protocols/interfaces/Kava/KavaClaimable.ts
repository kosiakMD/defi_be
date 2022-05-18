import { FeatureEnum } from '../../../../enums';
import { IProtocolMeta } from '../../../../interfaces';

export interface IKavaMeta extends IProtocolMeta {
  name: string;
  feature: FeatureEnum.claimable;
  context: {
    endpoint: string;
  };
}

export interface IKavaUserRewards {
  denom: string;
  amount: string;
}

export interface IKavaClaimable {
  owner: string;
  reward: IKavaUserRewards[];
}

export interface IKavaClaimableResponse {
  result: {
    hard_claims: {
      base_claim: IKavaClaimable;
    }[];
    delegator_claims: {
      base_claim: IKavaClaimable;
    }[];
    swap_claims: {
      base_claim: IKavaClaimable;
    }[];
  };
}
