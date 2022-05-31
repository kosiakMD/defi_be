import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

@Entity({ name: 'assets_category' })
export class AssetCategoryEntity extends BaseEntity {
  @Column({ nullable: false, type: 'text', unique: true })
  public name: string;

  @Column({ nullable: false, type: 'text', unique: true })
  public code: string;
}
