import BigNumber from 'bignumber.js';

import { Address } from '@app/common';

export type PoolId = number;

export type UserPoolBalanceInput = {
  amount: BigNumber;
  rewardDebt: BigNumber;
};

export type UserPoolBalances = Map<PoolId, UserPoolBalanceInput>;

export type PoolAddressMap = Map<PoolId, Address>;

// Contract
export type PoolInfoInput = {
  accSushiPerShare: BigNumber;
  lastRewardTime: BigNumber;
  allocPoint: BigNumber;
};

export type UserInfoInput = {
  amount: BigNumber;
  rewardDebt: BigNumber;
};

export type ContractPendingInput = {
  pending: BigNumber;
};

export type ContractDataInput =
  | PoolInfoInput
  | UserInfoInput
  | ContractPendingInput
  | BigNumber
  | number
  | string;

export type ContractPoolInfo = {
  accPerShare: BigNumber;
  lastRewardTime: BigNumber;
  allocPoint: BigNumber;
};

export type ContractUserInfo = {
  amount: BigNumber;
  rewardDebt: BigNumber;
};

export type ContractData = {
  lpToken: Address;
  poolInfo: ContractPoolInfo;
  poolLength: number;
  pending: BigNumber;
  userInfo: ContractUserInfo;
};

export type ContractDataMap = Map<PoolId, ContractData>;

// LP Token
export type LPTokenDataResponseInput = [number, any];

export type LPTokenSupplyInput = {
  _reserve0: BigNumber;
  _reserve1: BigNumber;
};

export type LPTokenDataInput = LPTokenSupplyInput | BigNumber | number | string;

export type LPTokenData = {
  address: Address;
  reserve0: BigNumber;
  reserve1: BigNumber;
  totalSupply: BigNumber;
  decimals?: number;
  name?: string;
  symbol?: string;
  token0?: Address;
  token1?: Address;
};

export type LPTokenDataMap = Map<Address, LPTokenData>;
