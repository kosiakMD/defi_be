import BigNumber from 'bignumber.js';

export interface TotalSupplies {
  [key: string]: BigNumber;
}

export interface TotalSuppliesResult {
  block: number;
  totalSupplies: TotalSupplies;
}

export interface UniswapPairReserves {
  reserve0: string;
  reserve1: string;
  blockTimestampLast: number;
}

export interface UniswapReservesData {
  [key: string]: UniswapPairReserves;
}

export interface UniswapReservesResult {
  block: number;
  reserves: UniswapReservesData;
}
