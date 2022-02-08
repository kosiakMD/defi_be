import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'asset_category', orderBy: { name: 'ASC' } })
export class AssetUnderlyingEntity extends BaseEntity {
  @Column({ type: Number, name: 'parent_asset_id', nullable: false })
  parentAssetId: number;

  @Column({ type: Number, name: 'underlying_asset_id', nullable: false })
  underlyingAssetId: number;

  @Column({ type: Number, nullable: false })
  position: number;
}
