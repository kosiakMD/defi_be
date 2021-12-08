import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Pair } from '../../../common/interfaces/assets.interface';

@Entity('assets_pools')
export class AssetsPoolsEntity {
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ name: 'pairs', type: 'json' })
  pairs: Pair[];

  @Column({ name: 'created_at', type: 'timestamp' })
  createdAt: string;
}
