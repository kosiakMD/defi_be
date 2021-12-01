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
