import {
  Column,
  Entity,
  JoinTable,
  JoinTableOptions,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { JoinColumnOptions } from 'typeorm/decorator/options/JoinColumnOptions';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetsCategoryEntity } from '../../assets-category/entities/assets-category.entity';
import { AssetsHistoricalPriceEntity } from '../../prices/entities/assets-historical-price.entity';
import { AssetsPriceEntity } from '../../prices/entities/assets-price.entity';
import { AssetUnderlyingEntity } from './assets-underlying.entity';

@Entity({ name: 'assets', orderBy: { name: 'ASC' } })
export class AssetsEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  public address: string;

  @Column({ type: String, nullable: true })
  public name: string;

  @Column({ type: String, nullable: true })
  public symbol: string;

  @Column({ type: String, nullable: true })
  public icon: string;

  @Column({ type: Number, name: 'chain_id', nullable: false })
  public chainId: number;

  @Column({ type: Number, name: 'decimals', nullable: false })
  public decimals: number;

  @Column({ type: Boolean, name: 'is_tracked', default: false })
  public isTracked: boolean;

  @Column({ type: Boolean, nullable: false, default: false })
  public disabled: boolean;

  @ManyToMany(() => AssetsCategoryEntity, {
    nullable: false,
    eager: true,
    cascade: false,
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
  } as JoinTableOptions)
  public categories: AssetsCategoryEntity[];

  @OneToMany(() => AssetsPriceEntity, (assetsPriceEntity) => assetsPriceEntity.assetId)
  public prices: AssetsPriceEntity[];

  @OneToMany(
    () => AssetsHistoricalPriceEntity,
    (assetsHistoricalPriceEntity) => assetsHistoricalPriceEntity.assetId,
  )
  public historicalPrices: AssetsHistoricalPriceEntity[];

  @ManyToMany(() => AssetUnderlyingEntity, (assetUnderlying) => assetUnderlying)
  public underlyingTokens: AssetUnderlyingEntity[];

  public averagePrice?: number;

  @Column({ type: Number, default: -1 })
  public rank: number;
}
