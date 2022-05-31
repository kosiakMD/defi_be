import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { AssetEntity } from '../../assets/entities/asset.entity';

@Unique(['asset', 'timestamp'])
@Entity({ name: 'assets_historical_prices' })
export class AssetHistoricalPriceEntity extends BaseEntity {
  @JoinColumn({ name: 'asset_id', referencedColumnName: 'id' })
  @ManyToOne(() => AssetEntity, { nullable: false })
  asset: AssetEntity;

  @Column()
  timestamp: Date;

  @Column({ type: 'numeric' })
  price: number;
}
