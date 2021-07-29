import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('eth_transactions')
export class EthTransactionsEntity {
  @PrimaryColumn({ name: 'hash' })
  hash: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'from' })
  from: string;

  @Column({ name: 'to' })
  to: string;

  @Column({ name: 'input' })
  input: string;

  @Column({ name: 'value' })
  value: number;

  @Column({ name: 'gas' })
  gas: number;

  @Column({ name: 'gas_price' })
  gasPrice: number;

  @Column({ name: 'index' })
  index: string;

  @AfterLoad()
  fromAndToInLowerCase(): void {
    this.from = this.from.toLowerCase();
    this.to = this.to.toLowerCase();
  }
}
