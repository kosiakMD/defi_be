import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Asset } from './asset.entity';

@Entity({ name: 'prices.asset_current_price' })
export class AssetCurrentPrice {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'asset_id', type: 'bigint' })
  assetId: number;

  @Column({ name: 'currency_id' })
  currencyId: number;

  @Column({ type: 'numeric' })
  value: number;

  @Column({ name: 'updated_at', type: 'timestamp without time zone' })
  updatedAt: number;

  @ManyToOne(() => Asset)
  @JoinColumn({ name: 'asset_id' })
  asset?: Asset;
}
