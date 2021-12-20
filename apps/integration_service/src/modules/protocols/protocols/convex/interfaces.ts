import { Address } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';

export interface BaseDataResponse {
  errors: [];
  data: BaseData[];
}

export interface PoolInfo {
  lptoken: Address;
  token: Address;
  gauge: Address;
  crvRewards: Address;
  stash: Address;
  shutdown: boolean;
}
