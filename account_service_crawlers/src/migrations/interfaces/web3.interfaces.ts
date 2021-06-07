import { Transaction } from 'web3-core';

export interface BlockHeader {
  number: number;
  hash: string;
  parentHash: string;
  nonce: string;
  sha3Uncles: string;
  logsBloom: string;
  transactionRoot: string;
  stateRoot: string;
  receiptRoot: string;
  miner: string;
  extraData: string;
  gasLimit: number;
  gasUsed: number;
  timestamp: number | string;
}

export interface BlockTransactionBase extends BlockHeader {
  size: number;
  difficulty: number;
  totalDifficulty: number;
  uncles: string[];
}

export interface BlockTransactionString extends BlockTransactionBase {
  transactions: string[];
}

export interface BlockTransactionObject extends BlockTransactionBase {
  transactions: Transaction[];
}
