import BigNumber from 'bignumber.js';

export interface TokenBalances {
  [key: string]: BigNumber;
}

export interface UniswapPairReserves {
  reserve0: BigNumber;
  reserve1: BigNumber;
  blockTimestampLast: number;
}

export interface TokenBalance {
  tokenContract: string;
  userAddress: string;
  balance: BigNumber;
}

export interface UniswapReservesData {
  [key: string]: UniswapPairReserves;
}

export interface MasterchiefPoolInfoResponse {
  id: number;
  lpToken: string;
  allocPoint: BigNumber;
  lastRewardBlock: BigNumber;
  accCakePerShare: BigNumber;
}

export interface CurvePoolInfoResponse {
  id: number;
  lpToken: string;
  oracleIndex: BigNumber;
  allocPoint: BigNumber;
  lastRewardTime: BigNumber;
  accRewardPerShare: BigNumber;
}

export interface MasterchiefPoolInfoTraderJoeResponse {
  id: number;
  lpToken: string;
  allocPoint: BigNumber;
  lastRewardTimestamp: BigNumber;
  accJoePerShare: BigNumber;
}
