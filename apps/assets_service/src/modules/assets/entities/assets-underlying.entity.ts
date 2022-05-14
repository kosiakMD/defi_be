import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetsEntity } from './assets.entity';

@Entity({ name: 'assets_underlying', orderBy: { name: 'ASC' } })
export class AssetUnderlyingEntity extends BaseEntity {
  @ManyToOne(() => AssetsEntity, (asset) => asset.underlyingTokens)
  @JoinColumn({
    name: 'asset_id',
    referencedColumnName: 'id',
  })
  asset: AssetsEntity;

  @ManyToOne(() => AssetsEntity)
  @JoinColumn({
    name: 'underlying_asset_id',
    referencedColumnName: 'id',
  })
  underlyingAsset: Promise<AssetsEntity> | AssetsEntity;

  @Column({ type: Number, nullable: false })
  position: number;
}
