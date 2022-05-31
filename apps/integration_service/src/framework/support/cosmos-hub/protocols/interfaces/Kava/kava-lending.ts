import { FeatureEnum } from '../../../../enums';
import { IProtocolMeta } from '../../../../interfaces';

export type UserLendingType = 'supplied' | 'borrowed';
export type UserLendingMap = Map<string, { type: UserLendingType; amount: IKavaDenomAmount[] }[]>;

export interface IKavaMeta extends IProtocolMeta {
  name: string;
  feature: FeatureEnum.lending;
  context: {
    endpoint: string;
  };
}
export type IKavaDenomIndex = {
  denom: string;
  value: string;
};
export type IKavaDenomAmount = {
  denom: string;
  amount: string;
};

export interface IKavaRepositoryResponse {
  height: string;
  result: IKavaDenomAmount[];
}

export interface IKavaLendingResponse {
  height: string;
  result: {
    borrower?: string;
    depositor?: string;
    amount: IKavaDenomAmount[];
    index: IKavaDenomIndex[];
  }[];
}

export interface IHardParameterResponse {
  result: {
    money_markets: {
      denom: string;
      borrow_limit: {
        loan_to_value: string;
      };
    }[];
  };
}

export interface IncentiveParametersResponse {
  result: {
    hard_supply_reward_periods: {
      collateral_type: string;
      rewards_per_second: IKavaDenomAmount[];
    }[];
  };
}

export interface InterestRateResponse {
  result: {
    denom: string;
    supply_interest_rate: string;
    borrow_interest_rate: string;
  }[];
}
