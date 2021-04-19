import { Pair } from './pair.interface';
import { Transaction } from './transaction';

export interface Burn {
  id: string;
  transaction: Transaction;
  timestamp: number;
  pair: Pair;
  liquidity: number;
  sender: string;
  amount0: number;
  amount1: number;
  to: string;
  logIndex: BigInt;
  amountUSD: number;
  needsComplete: boolean;
  feeTo: string;
  feeLiquidity: number;
}
