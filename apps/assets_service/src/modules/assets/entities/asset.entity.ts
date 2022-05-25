import { Column, Entity, JoinTable, ManyToMany, OneToMany, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetCategoryEntity } from '../../assets-category/entities/asset-category.entity';
import { AssetHistoricalPriceEntity } from '../../prices/entities/asset-historical-price.entity';
import { AssetPriceEntity } from '../../prices/entities/asset-price.entity';
import { AssetMetadata } from '../types/asset-metadata.type';
import { AssetUnderlyingEntity } from './asset-underlying.entity';

@Unique(['address', 'chainId'])
@Entity({ name: 'assets' })
export class AssetEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  public address: string;

  @Column({ type: String, nullable: true })
  public name?: string;

  @Column({ type: String, nullable: true })
  public symbol?: string;

  @Column({ type: String, nullable: true })
  public icon?: string;

  @Column({ type: Number, nullable: false })
  public chainId: number;

  @Column({ type: Number, nullable: false })
  public decimals: number;

  @Column({ type: Number, nullable: true })
  public rank?: number;

  @Column({ type: Boolean, default: false })
  public isTracked: boolean;

  @Column({ type: 'json', nullable: false, default: {} })
  public metadata: AssetMetadata;

  @Column({ type: Boolean, nullable: false, default: false })
  public disabled: boolean;

  @ManyToMany(() => AssetCategoryEntity, {
    nullable: false,
    eager: true,
    cascade: true,
  })
  @JoinTable({
    name: 'assets_to_categories',
    joinColumn: {
      name: 'asset_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'category_id',
      referencedColumnName: 'id',
    },
  })
  public categories: AssetCategoryEntity[];

  @OneToMany(() => AssetPriceEntity, (price) => price.asset)
  public prices: AssetPriceEntity[];

  @OneToMany(() => AssetHistoricalPriceEntity, (historicalPrice) => historicalPrice.asset)
  // TODO: Remove this reference from entity
  public historicalPrices: AssetHistoricalPriceEntity[];

  @ManyToMany(() => AssetUnderlyingEntity, (underlying) => underlying.asset)
  public underlying: AssetUnderlyingEntity[];
}
