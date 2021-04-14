import { Mint } from './mint';
import { Burn } from './burn';
import { Swap } from './swap';

export interface Transaction {
	id: string;
	timestamp: number;
	blockNumber: number;
	mints: Mint[]
	burns: Burn[]
	swaps: Swap[]
}
