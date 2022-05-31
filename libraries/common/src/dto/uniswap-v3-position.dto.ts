import { ERC20Token } from './erc20-token';
import { UniswapV3Pool } from './uniswap-v3-pool.dto';
import { UniswapV3Tick } from './uniswap-v3-tick.dto';

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
