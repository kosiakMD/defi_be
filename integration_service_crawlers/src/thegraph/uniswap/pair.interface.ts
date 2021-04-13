import { Token } from './token';

export interface Pair {
	id: string;
	token0: Token;
	token1: Token;
	reserve0: number;
	reserve1: number;
	totalSupply: number;
	reserveETH: number;
	reserveUSD: number;
	trackedReserveETH: number;
	token0Price: number;
	token1Price: number;
	volumeToken0: number;
	volumeToken1: number;
	volumeUSD: number;
	untrackedVolumeUSD: number;
	txCount: number;
	createdAtTimestamp: number;
	createdAtBlockNumber: number;
	liquidityProviderCount: number;
}
