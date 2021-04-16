import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationMint } from '../../interfaces/entity.information.interfaces';

@Entity('pancake_mints')
export class PancakeMintsEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ type: 'json' })
  information: InformationMint;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'block_number' })
  blockNumber: number;
}
