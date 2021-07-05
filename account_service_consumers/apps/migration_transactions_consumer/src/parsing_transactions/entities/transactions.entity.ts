import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { ParsedTransfers } from '../transactions.parsing.interfaces';

@Entity('transactions')
export class TransactionsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id?: number;

  @Column({ name: 'hash' })
  hash: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'address' })
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
