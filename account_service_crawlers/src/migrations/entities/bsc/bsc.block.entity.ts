import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('bsc_blocks')
export class BscBlockEntity {
  @PrimaryColumn()
  number: number;

  @Column()
  timestamp: string;

  @Column()
  hash: string;
}
