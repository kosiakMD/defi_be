import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

import { AssetEntity } from '../../assets/entities/asset.entity';

@Unique(['asset', 'timestamp'])
@Entity({ name: 'assets_prices' })
export class AssetPriceEntity extends BaseEntity {
  @Column({ type: 'numeric' })
  price: number;

  @Column()
  sourceId: number;

  @JoinColumn({ name: 'asset_id', referencedColumnName: 'id' })
  @ManyToOne(() => AssetEntity, (asset) => asset.prices, { nullable: false })
  asset: AssetEntity;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
