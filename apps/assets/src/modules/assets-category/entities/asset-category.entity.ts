import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_category' })
export class AssetCategoryEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text', unique: true })
  public name: string;

  @Column({ nullable: false, type: 'text', unique: true })
  public code: string;
}
