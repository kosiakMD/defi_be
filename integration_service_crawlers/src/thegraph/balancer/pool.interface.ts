import { PoolToken } from './pool.token.interface';

export interface Pool {
	id: string;
	controller: string;
	publicSwap: boolean;
	finalized: boolean;
	crp: boolean;
	crpController: string;
	symbol: string;
	name: string;
	cap: number;
	totalSupply: number;
	active: boolean;
	swapFee: number;
	totalWeight: number;
	totalShares: number;
	totalSwapVolume: number;
	totalSwapFee: number;
	liquidity: number;
	tokens: PoolToken[];
	createTime: number;
	tokensCount: number;
	holdersCount: number;
	joinsCount: number;
	exitsCount: number;
	swapsCount: number;
	tx: string;
}
