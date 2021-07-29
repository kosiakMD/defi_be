import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { fromHexToAddress } from '../../util/util';

@Entity('eth_events')
export class EthEventsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id?: number;

  @Column({ name: 'transaction_hash' })
  transactionHash: string;

  @Column({ name: 'topic_1' })
  topic1: string;

  @Column({ name: 'topic_2' })
  topic2: string;

  @Column({ name: 'topic_3' })
  topic3: string;

  @Column({ name: 'topics' })
  topics: string;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'data' })
  data: string;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'log_index' })
  logIndex: number;

  @AfterLoad()
  topicsToString(): void {
    this.topic2 = fromHexToAddress(this.topic2);
    this.topic3 = fromHexToAddress(this.topic3);
    this.address = this.address.toLowerCase();
  }
}
