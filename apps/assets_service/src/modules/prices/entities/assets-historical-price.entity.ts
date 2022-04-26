import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'assets_historical_prices' })
export class AssetsHistoricalPriceEntity {
  @PrimaryColumn()
  timestamp: Date;

  @Column({ type: 'numeric' })
  open: number;

  @Column({ type: 'numeric' })
  high: number;

  @Column({ type: 'numeric' })
  low: number;

  @Column({ type: 'numeric' })
  close: number;

  @Column()
  ticks: number;

  @PrimaryColumn({ name: 'asset_id' })
  assetId: number;

  @PrimaryColumn({ name: 'time_granularity' })
  timeGranularity: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
