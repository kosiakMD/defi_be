import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bsc_blocks_info')
export class BscBlocksInfoEntity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'from_block' })
  fromBlock: number;

  @Column({ name: 'to_block' })
  toBlock: number;

  @Column()
  information: string;

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
