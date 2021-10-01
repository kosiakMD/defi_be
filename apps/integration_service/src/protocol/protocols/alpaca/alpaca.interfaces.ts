import BigNumber from 'bignumber.js';

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
