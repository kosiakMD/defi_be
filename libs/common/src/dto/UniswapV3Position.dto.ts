import { ERC20Token } from './ERC20Token';
import { UniswapV3Pool } from './UniswapV3Pool.dto';
import { UniswapV3Tick } from './UniswapV3Tick.dto';

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
