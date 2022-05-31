import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { AssetEntity } from './asset.entity';

@Entity({ name: 'prices.asset_price' })
export class AssetPriceEntity {
  @PrimaryColumn()
  @Column({ name: 'asset_id', primary: true })
  public assetId: number;

  @PrimaryColumn()
  @Column({ name: 'currency_id', primary: true })
  public currencyId: number;

  @Column()
  public value: number;

  @PrimaryColumn()
  @Column({ primary: true })
  public timestamp: number;

  @ManyToOne(() => AssetEntity, (asset: AssetEntity) => asset.assetPrices)
  @JoinColumn({ name: 'asset_id' })
  public asset: AssetEntity;
}
