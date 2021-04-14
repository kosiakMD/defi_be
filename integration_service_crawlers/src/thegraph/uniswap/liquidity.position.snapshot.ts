import { User } from './user';
import { Pair } from './pair.interface';

export interface LiquidityPositionSnapshot {
	id: string;
	timestamp: number;
	block: number;
	user: User;
	pair: Pair;
	token0PriceUSD: number;
	token1PriceUSD: number;
	reserve0: number;
	reserve1: number;
	reserveUSD: number;
	liquidityTokenTotalSupply: number;
	liquidityTokenBalance: number;
}
