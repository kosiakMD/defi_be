import { Column, Entity, PrimaryColumn } from 'typeorm';

import { ChainIdEnum } from 'src/common/enum';

import { ColumnNumericTransformer } from '../dto/column.numeric.transformer';
import { SubTransaction } from '../interfaces/transactions.interfaces';

@Entity('transactions_new')
export class TransactionNewEntity {
  @PrimaryColumn({ name: 'hash' })
  hash: string;

  @PrimaryColumn({ name: 'address' })
  address: string;

  @Column({
    name: 'block_number',
    transformer: new ColumnNumericTransformer(),
  })
  blockNumber: number;

  @Column({ name: 'timestamp' })
  timestamp: string;

  @Column({ name: 'sender' })
  sender?: string;

  @Column({ name: 'destination' })
  destination?: string;

  @Column({ name: 'gas_price', transformer: new ColumnNumericTransformer() })
  gasPrice: number;

  @Column({ name: 'gas_used', transformer: new ColumnNumericTransformer() })
  gasUsed: number;

  @Column({ name: 'fee_usd', transformer: new ColumnNumericTransformer() })
  feeUsd?: number;

  @Column({ name: 'token_operation' })
  tokenOperation: string;

  @Column({ name: 'chain_id', transformer: new ColumnNumericTransformer() })
  chainId: ChainIdEnum;

  @Column({ name: 'sub_transactions', type: 'json' })
  subTransactions: SubTransaction;

  @Column({ name: 'is_visible' })
  isVisible: boolean;
}
