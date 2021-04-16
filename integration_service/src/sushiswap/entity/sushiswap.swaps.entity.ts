import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationSwap } from '../../interfaces/entity.information.interfaces';

@Entity('sushiswap_swaps')
export class SushiswapSwapsEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ type: 'json' })
  information: InformationSwap;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'from_address' })
  fromAddress: string;
}
