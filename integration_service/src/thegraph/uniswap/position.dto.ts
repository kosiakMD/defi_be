import { ERC20Token } from 'src/interfaces/transactions.interfaces';

export interface UniswapV3Tick {
  tickIdx: string;
  feeGrowthOutside0X128: string;
  feeGrowthOutside1X128: string;
}

export interface UniswapV3Pool {
  id: string;
  liquidity: string;
  sqrtPrice: string;
  tick: string;
  feeGrowthGlobal0X128: string;
  feeGrowthGlobal1X128: string;
  totalValueLockedToken0: string;
  totalValueLockedToken1: string;
  totalValueLockedUSD: string;
}

export interface UniswapV3Position {
  owner: string;
  tokenId: string;
  liquidity: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
  tickLower: UniswapV3Tick;
  tickUpper: UniswapV3Tick;
  token0: ERC20Token;
  token1: ERC20Token;
  pool: UniswapV3Pool;
}
