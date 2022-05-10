import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetsMetadata } from '../../../common/interfaces/assets.interface';

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

  @Column({ type: 'json', nullable: true })
  public metadata: AssetsMetadata;

  @ManyToOne(() => AssetsCategoryEntity, {
    nullable: true,
    eager: true,
    cascade: false,
  })
  public category: AssetsCategoryEntity;

  @OneToMany(() => AssetsPriceEntity, (assetsPriceEntity) => assetsPriceEntity.assetId)
  public prices: AssetsPriceEntity[];

  @OneToMany(
    () => AssetsHistoricalPriceEntity,
    (assetsHistoricalPriceEntity) => assetsHistoricalPriceEntity.assetId,
  )
  public historicalPrices: AssetsHistoricalPriceEntity[];

  @OneToMany(() => AssetUnderlyingEntity, (assetUnderlying) => assetUnderlying)
  public underlyingTokens: AssetUnderlyingEntity[];

  public averagePrice?: number;

  @Column({ type: Number, default: -1 })
  public rank: number;
}
