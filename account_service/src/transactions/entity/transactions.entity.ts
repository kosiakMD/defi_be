// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { Address } from '../../common/interfaces';
import { SubTransactionDto } from '../dto/transactions.dto';

class TransactionData {
  @ApiProperty({ type: String, example: '0xab5c66752a9e8167967685f1450532fb96d5d24f' })
  address: Address;
  @ApiProperty({ type: String, example: 95000 })
  gas: number;
  @ApiProperty({ type: String, example: '16000000000' })
  gasPrice: string;
  @ApiProperty({
    type: String,
    example: '0x50e8849744aaa511003ef9a89bd36199b8282e33a5df57eee6c1de860b550ba3',
  })
  hash: string;
  @ApiProperty({ type: String, example: 'receive' })
  name: string;

  subTransactions: SubTransactionDto;
}

@Entity('transactions')
export class TransactionsEntity {
  @PrimaryColumn({ name: 'id' })
  id: number;

  @Column({ name: 'hash' })
  hash: string;

  @Column({ name: 'block_number' })
  blockNumber: string;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'timestamp' })
  timestamp: string;

  @Column({ name: 'transaction_data', type: 'json' })
  data: TransactionData;
}
