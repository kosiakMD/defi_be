import { Column, Entity, PrimaryColumn } from 'typeorm';

import { SubTransactions } from '../transaction.fix.interface';

@Entity('transactions_new')
export class TransactionNewEntity {
  @PrimaryColumn({ name: 'hash' })
  hash: string;

  @PrimaryColumn({ name: 'address' })
  address: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'timestamp' })
  timestamp: string;

  @Column({ name: 'gas_price' })
  gasPrice: string;

  @Column({ name: 'gas_used' })
  gasUsed: number;

  @Column({ name: 'fee_usd' })
  feeUsd: number;

  @Column({ name: 'token_operation' })
  tokenOperation: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @Column({ name: 'sub_transactions', type: 'json' })
  subTransactions: SubTransactions[];

  @Column({ name: 'is_visible' })
  isVisible: boolean;

  @Column({ name: 'sender' })
  sender: string;

  @Column({ name: 'destination' })
  destination: string;
}
