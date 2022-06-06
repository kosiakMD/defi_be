import { Exclude, Expose } from 'class-transformer';
import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Exclude()
@Entity({ name: 'assets_category' })
export class AssetCategoryEntity extends BaseEntity {
  @Expose()
  @Column({ nullable: false, type: 'text', unique: true })
  public name: string;

  @Expose()
  @Column({ nullable: false, type: 'text', unique: true })
  public code: string;
}
