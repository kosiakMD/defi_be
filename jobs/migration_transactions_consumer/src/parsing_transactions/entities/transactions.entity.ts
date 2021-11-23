import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ParsedTransfers } from '../transactions.parsing.interfaces';

@Entity('transactions')
export class TransactionsEntity {
  @Column({ name: 'id' })
  id?: number;

  @PrimaryColumn({ name: 'hash' })
  hash: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @PrimaryColumn({ name: 'address' })
  address: string;

  @Column({ name: 'timestamp' })
  timestamp: string;

  @Column({ name: 'transaction_data', type: 'json' })
  transactionData: ParsedTransfers;

  constructor(
    hash: string,
    blockNumber: number,
    address: string,
    timestamp: string,
    transactionData: ParsedTransfers,
  ) {
    this.hash = hash;
    this.blockNumber = blockNumber;
    this.address = address;
    this.timestamp = timestamp;
    this.transactionData = transactionData;
  }
}
