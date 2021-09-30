import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Asset } from './asset.entity';

@Entity({ name: 'prices.asset_price' })
export class AssetPrice {
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

  @ManyToOne(() => Asset, (asset: Asset) => asset.assetPrices)
  @JoinColumn({ name: 'asset_id' })
  public asset: Asset;
}
