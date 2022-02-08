import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';
import { AssetCategoryEnum } from '@app/common/enum';

@Entity({ name: 'asset_category', orderBy: { name: 'ASC' } })
export class AssetCategoryEntity extends BaseEntity {
  @Column()
  name: AssetCategoryEnum;

  @Column({ name: 'asset_id', unique: true })
  assetId: number;
}
