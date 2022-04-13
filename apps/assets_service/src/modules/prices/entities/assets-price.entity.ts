import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetsEntity } from '../../assets/entities/assets.entity';
import { PriceSourceEntity } from './price-sources.entity';

@Entity({ name: 'assets_prices', orderBy: { name: 'ASC' } })
export class AssetsPriceEntity extends BaseEntity {
  @Column({ name: 'price' })
  price: number;

  @ManyToOne(() => PriceSourceEntity, (priceSource: PriceSourceEntity) => priceSource.id, {
    nullable: false,
    eager: false,
    cascade: false,
  })
  @Column({ name: 'source_id' })
  sourceId: number;

  @OneToOne(() => AssetsEntity, {
    createForeignKeyConstraints: true,
    onDelete: 'CASCADE',
    nullable: true,
    eager: true,
    cascade: true,
  })
  @Column({ name: 'asset_id' })
  assetId: number;
}
