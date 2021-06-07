import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('eth_events')
export class EthEventsEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'transaction_hash' })
  transactionHash: string;

  @Column({ name: 'topic_1' })
  topic1: string;

  @Column({ name: 'topic_2' })
  topic2: string;

  @Column({ name: 'topic_3' })
  topic3: string;

  @Column()
  topics: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column()
  data: string;

  @Column()
  address: string;

  @Column({ name: 'log_index' })
  logIndex: number;
}
