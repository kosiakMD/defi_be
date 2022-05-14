import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';
import { AssetCategoryEnum } from '@app/common/enum';

@Entity({ name: 'assets_category', orderBy: { name: 'ASC' } })
export class AssetsCategoryEntity extends BaseEntity {
  @Column({ nullable: false, type: String, unique: true })
  public name: string;
  @Column({ nullable: false, type: String, unique: true })
  public code: string;
}
