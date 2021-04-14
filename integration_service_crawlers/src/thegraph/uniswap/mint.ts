import { Pair } from './pair.interface';
import { Transaction } from './transaction';

export interface Mint {
	id: String
	transaction: Transaction
	timestamp: number;
	pair: Pair
	to: string
	liquidity: number;
	sender: string
	amount0: number;
	amount1: number;
	logIndex: BigInt
	amountUSD: number;
	feeTo: string
	feeLiquidity: number;
}
