import { Exclude } from 'class-transformer';
import { Column, Entity, Index, JoinTable, ManyToMany, OneToMany, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetCategoryEntity } from '../../assets-category/entities/asset-category.entity';
import { AssetCategory } from '../enums/asset-category.enum';
import { AssetMetadata } from '../types/asset-metadata.type';
import { AssetUnderlyingEntity } from './asset-underlying.entity';

@Unique(['address', 'chainId'])
@Entity({ name: 'assets' })
export class AssetEntity extends BaseEntity {
  @Index()
  @Column({ type: String, nullable: false })
  public address: string;

  @Index('assets_name_index')
  @Column({ type: String, nullable: true })
  public name?: string;

  @Index('assets_symbol_index')
  @Column({ type: String, nullable: true })
  public symbol?: string;

  @Index('assets_display_name_index')
  @Column({ type: String, nullable: true })
  public displayName?: string;

  @Column({ type: String, nullable: true })
  public icon?: string;

  @Column({ type: Number, nullable: false })
  public chainId: number;

  @Column({ type: Number, nullable: false })
  public decimals: number;

  @Column({ type: Number, nullable: true })
  public rank?: number;

  @Exclude({ toPlainOnly: true })
  @Column({ type: Boolean, default: false })
  public isTracked: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({ type: 'json', nullable: false, default: {} })
  public metadata: AssetMetadata;

  @Exclude({ toPlainOnly: true })
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

  @OneToMany(() => AssetUnderlyingEntity, (underlying) => underlying.asset, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  public underlying: AssetUnderlyingEntity[];

  get isLpToken(): boolean {
    return this.categories.some(({ code }) => code === AssetCategory.LpToken);
  }
}
