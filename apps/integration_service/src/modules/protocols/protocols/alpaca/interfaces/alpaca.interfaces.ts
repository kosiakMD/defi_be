import BigNumber from 'bignumber.js';

import { ProtocolTypeEnum } from '@app/common';

import { LPToken } from '../../../../../common/dto';
import {
  AmountAble,
  BaseData,
  ERC20Token,
  PoolToken,
  StakingErcToken,
} from '../../../../../common/interfaces/transactions.interfaces';

export interface AlpacaBalance {
  id: string;
  balance: string;
}

export interface AlpacaUser {
  id: string;
  balances: AlpacaBalance[];
}

export interface AlpacaStakingInterface {
  stakeToken?: string;
  poolNum: number;
  userAddress: string;
  amount?: string;
  claimable?: string;
  isLp?: boolean;
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
  token0?: string;
  token1?: string;
  coefficient?: string;
  tokenAddress?: string;
}

export interface VaultUserInfo {
  amount: BigNumber;
  rewardDebt: BigNumber;
  bonusDebt: BigNumber;
}

export interface AlpacaApiResponse {
  id: number;
  vault: string;
  owner: string;
  positionId: number;
  worker: string;
}

export interface LeverageFarmingInterface {
  address?: string;
  vault: string;
  poolToken?: string;
  token1?: string;
  token0?: string;
  baseTokenBalance?: string;
  borrow?: string;
  positionId?: number;
  baseToken?: string;
  tokens?: string[];
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
  isLp: boolean;
}

export interface AlpacaTokenInfo {
  totalSupply: string;
  coefficient: string;
  priceAsset: string;
}

export interface PoolTokenStaked extends ERC20Token, AmountAble {}

export interface ClaimAbleToken extends ERC20Token {
  claimed?: string;
  claimable?: string;
  priceUSD?: number;
}

export interface StakingPosition {
  address: string;
  poolId?: string;
  staked: string;
  lpToken?: PoolTokenStaked;
  rewardToken?: ClaimAbleToken;
  stakingToken: LPToken | StakingErcToken;
  liquidityPoolTokens?: PoolToken[];
}

export interface Staking extends BaseData<ProtocolTypeEnum.staking> {
  stakingPositions: StakingPosition[];
}

export interface AlpacaStakingInterface {
  stakeToken?: string;
  poolNum: number;
  userAddress: string;
  amount?: string;
  claimable?: string;
}

export interface VaultUserInfo {
  amount: BigNumber;
  rewardDebt: BigNumber;
  bonusDebt: BigNumber;
}

export interface AlpacaApiResponse {
  id: number;
  vault: string;
  owner: string;
  positionId: number;
  worker: string;
}

export interface WorkerContractData {
  address?: string;
  vault: string;
  poolToken?: string;
  positionId?: number;
  baseToken?: string;
  isLp: boolean;
  shares?: string;
  worker?: string;
}

export interface AlpacaTokenInfo {
  totalSupply: string;
  coefficient: string;
  priceAsset: string;
}

export interface TokenContractData {
  [key: string]: {
    reserve0: string;
    reserve1: string;
    totalSupply: string;
    token0: string;
    token1: string;
  };
}

export interface BorrowBalance {
  [key: string]: string;
}

export interface TokensBalance {
  [key: string]: string;
}
