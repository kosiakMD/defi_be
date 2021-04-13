import { Pool } from './pool.interface';

export interface LiquidityPosition {
	id: string;
	user: string
	pool: Pool
	poolTokenBalance: number
	gaugeStakedBalance: number
	minted: number
}
