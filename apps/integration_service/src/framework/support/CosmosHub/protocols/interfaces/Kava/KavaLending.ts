import { FeatureEnum } from '@app/common';

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
