import BigNumber from 'bignumber.js';

export interface AutofarmBalance {
  amount: string;
  id: string;
}

export interface AutofarmUser {
  balances: AutofarmBalance[];
  id: string;
  totalAmount: string;
}

export interface AutofarmVaultPoolInfo {
  want: string;
  allocPoint: BigNumber;
  lastRewardBlock: BigNumber;
  accAUTOPerShare: BigNumber;
  strat: string;
}

export interface VaultUserInfo {
  shares: BigNumber;
  rewardDebt: BigNumber; //- claimable amount
}

export interface StakingInterface {
  poolNum: number;
  userAddress: string;
  amount?: string;
  contractAddress?: string;
  claimable?: string;
  isLp?: boolean;
  reserve0?: string;
  reserve1?: string;
  totalSupply?: string;
  token0?: string;
  token1?: string;
}

export interface TotalSupplies {
  [key: string]: BigNumber;
}

export interface TotalSuppliesResult {
  block: number;
  totalSupplies: TotalSupplies;
}

export interface UniswapPairReserves {
  reserve0: BigNumber;
  reserve1: BigNumber;
  blockTimestampLast: number;
}

export interface UniswapReservesData {
  [key: string]: UniswapPairReserves;
}

export interface UniswapReservesResult {
  block: number;
  reserves: UniswapReservesData;
}
