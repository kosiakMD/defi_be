import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationMint } from '../../interfaces/entity.information.interfaces';
import { ColumnType } from 'src/common/enum';

@Entity('uniswap_mints')
export class UniswapMintsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'block_number', nullable: true })
  blockNumber: number;

  @Column({ name: 'created_at', type: ColumnType.timestamptz })
  createdAt: Date;

  @Column({ type: ColumnType.json })
  information: InformationMint;

  @Column()
  sender: string;

  @Column({ name: 'to_address' })
  toAddress: string;
}
