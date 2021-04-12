import { Base, Transaction } from './common';

export interface Transactions extends Base<'transaction'> {
  txs: Transaction[];
}
