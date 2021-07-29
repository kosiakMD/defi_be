import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('eth_blocks')
export class EthBlocksEntity {
  @PrimaryColumn({ name: 'number' })
  number: number;

  @Column({ name: 'timestamp' })
  timestamp: string;

  @Column({ name: 'hash' })
  hash: string;
}
