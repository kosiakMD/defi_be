import { Address } from '@app/common';

export interface ITokenPosition {
  token0: Address;
  token1: Address;
  pool: Address;
  fee: number;
  tickLower: number; // stringified number, i.e. -124525
  tickUpper: number;
  feeGrowthInside0LastX128: string; // '6089342175838368700837435060498180578922'
  feeGrowthInside1LastX128: string;
  liquidity: string;
  key: string; // sha256 key
  tokensOwed0: string; // always zero?
  tokensOwed1: string; // always zero?
}

export interface ITickLimit {
  tick: number;
  feeGrowthOutside0X128: string;
  feeGrowthOutside1X128: string;
}

export interface IPool {
  address: Address;
  token0: Address;
  token1: Address;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  sqrtPrice: string;
  tickCurrent: number;
  tickLower: ITickLimit;
  tickUpper: ITickLimit;
  liquidity: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  tokensOwed0: string;
  tokensOwed1: string;
}
