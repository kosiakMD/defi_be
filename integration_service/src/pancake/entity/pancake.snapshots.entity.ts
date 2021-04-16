import { Column, Entity, PrimaryColumn } from 'typeorm';

import { InformationSnapshot } from '../../interfaces/entity.information.interfaces';

@Entity('pancake_snapshots')
export class PancakeSnapshotsEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'user_address' })
  userAddress: string;

  @Column({ type: 'json' })
  information: InformationSnapshot;

  @Column({ name: 'block_number' })
  blockNumber: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
