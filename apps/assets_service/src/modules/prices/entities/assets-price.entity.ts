import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_prices' })
export class AssetsPriceEntity extends BaseEntity {
  @Column({ name: 'price', type: 'numeric' })
  price: number;

  @Column({ name: 'source_id' })
  sourceId: number;

  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
