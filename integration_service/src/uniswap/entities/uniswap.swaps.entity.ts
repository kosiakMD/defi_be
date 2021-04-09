import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationSwap } from '../interfaces/entity.information.interfaces';

@Entity('uniswap_swaps')
export class UniswapSwapsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'block_number', nullable: true })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'json' })
  information: InformationSwap;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ name: 'from_address' })
  fromAddress: string;
}
