import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetEntity } from './asset.entity';

@Unique(['asset', 'underlyingAsset'])
@Entity({ name: 'assets_underlying' })
export class AssetUnderlyingEntity extends BaseEntity {
  @ManyToOne(() => AssetEntity, (asset) => asset.underlying)
  @JoinColumn({
    name: 'asset_id',
    referencedColumnName: 'id',
  })
  asset: AssetEntity;

  @OneToOne(() => AssetEntity)
  @JoinColumn({
    name: 'underlying_asset_id',
    referencedColumnName: 'id',
  })
  underlyingAsset: AssetEntity;

  @Column({ type: Number, nullable: false })
  position: number;
}
