import { Type } from 'class-transformer';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationSwap } from '../../interfaces/entity.information.interfaces';

@Entity('pancake_swaps')
export class PancakeSwapsEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ type: 'json' })
  @Type(() => InformationSwap)
  information: InformationSwap;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'from_address' })
  fromAddress: string;
}
