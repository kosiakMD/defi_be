import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationMint } from '../interfaces/entity.information.interfaces';

@Entity('uniswap_mints')
export class UniswapMintsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'block_number', nullable: true })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'json' })
  information: InformationMint;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;
}
