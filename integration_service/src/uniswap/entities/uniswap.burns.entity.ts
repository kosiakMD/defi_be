import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationBurn } from '../interfaces/entity.information.interfaces';

@Entity('uniswap_burns')
export class UniswapBurnsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'block_number', nullable: true })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'json' })
  information: InformationBurn;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;
}
