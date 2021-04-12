import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import Asset from './asset.entity';

@Entity({ name: 'prices.asset_price' })
class AssetPrice {
  @PrimaryColumn({ name: 'asset_id' })
  public assetId: number;

  @Column({ name: 'currency_id' })
  public currencyId: number;

  @Column({ name: 'value' })
  public value: number;

  @Column({ name: 'timestamp' })
  public timestamp: number;

  @ManyToOne(() => Asset, (asset: Asset) => asset.assetPrices)
  @JoinColumn({ name: 'asset_id' })
  public asset: Asset;
}

export default AssetPrice;
