import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('eth_transactions')
export class EthTransactionsEntity {
  @PrimaryColumn()
  hash: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  input: string;

  @Column()
  value: number;

  @Column()
  gas: number;

  @Column({ name: 'gas_price' })
  gasPrice: number;

  @Column()
  index: string;
}
