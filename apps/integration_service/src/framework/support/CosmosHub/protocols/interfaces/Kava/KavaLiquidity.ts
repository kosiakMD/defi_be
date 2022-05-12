import type { FeatureEnum } from '@app/common';

import type { IProtocolMeta } from '../../../../interfaces';
import { IPoolFeatureEntryGeneric } from '../../../../interfaces/feature.pool.interface';
import { IRewardTokenMinimal } from '../../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../../interfaces/tokens.supplied.interface';

export interface IKavaPool {
  name: string;
  coins: {
    denom: string;
    amount: string;
  }[];
  total_shares: string;
}

export interface IKavaDeposits {
  depositor: string;
  pool_id: string;
  shares_owned: string;
  shares_value: {
    denom: string;
    amount: string;
  }[];
}

export interface IKavaLiquidityRepositoryResponse {
  pools: IKavaPool[];
}

export interface IKavaLiquidityDepositsResponse {
  deposits: IKavaDeposits[];
}

export interface IKavaMeta extends IProtocolMeta {
  name: string;
  feature: FeatureEnum.pools;
  context: {
    endpoint: string;
  };
}

export interface IKavaSupplyTokenMinimal extends ISupplyTokenMinimal {
  token: {
    address: string;
    underlying: {
      address: string;
      totalSupplied: string;
    }[];
  };
}

export type IKavaPoolFeatureEntryMinimal = IPoolFeatureEntryGeneric<
  IKavaSupplyTokenMinimal,
  IRewardTokenMinimal
>;
