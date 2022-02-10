import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_prices', orderBy: { name: 'ASC' } })
export class AssetPriceEntity extends BaseEntity {
  @Column({ name: 'asset_id' })
  assetId: number;

  @Column({ name: 'price_in_usd' })
  priceInUsd: number;

  @Column({ name: 'source_id' })
  sourceId: number;
}
