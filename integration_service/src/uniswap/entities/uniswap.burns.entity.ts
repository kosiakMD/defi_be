import { ColumnType } from 'src/common/enum';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationBurn } from '../../interfaces/entity.information.interfaces';

@Entity('uniswap_burns')
export class UniswapBurnsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'block_number', nullable: true })
  blockNumber: number;

  @Column({ name: 'created_at', type: ColumnType.timestamptz })
  createdAt: Date;

  @Column({ type: ColumnType.json })
  information: InformationBurn;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;
}
