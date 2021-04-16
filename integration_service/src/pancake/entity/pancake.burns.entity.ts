import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationBurn } from '../../interfaces/entity.information.interfaces';

@Entity('pancake_burns')
export class PancakeBurnsEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;

  @Column({ type: 'json' })
  information: InformationBurn;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'block_number' })
  blockNumber: number;
}
