import { Pair } from './pair.interface';
import { Transaction } from './transaction';

export interface Swap {
	id: string;
	transaction: Transaction;
	timestamp: number;
	pair: Pair;
	sender: string;
	from: string;
	amount0In: number;
	amount1In: number;
	amount0Out: number;
	amount1Out: number;
	to: string;
	logIndex: BigInt
	amountUSD: number;
}
