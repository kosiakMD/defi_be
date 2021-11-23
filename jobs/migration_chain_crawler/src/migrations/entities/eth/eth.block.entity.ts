import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('eth_blocks')
export class EthBlockEntity {
  @PrimaryColumn()
  number: number;

  @Column()
  timestamp: string;

  @Column()
  hash: string;
}
