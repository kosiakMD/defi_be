import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import AssetPrice from './asset_price.entity';

@Entity({ name: 'prices.asset' })
class Asset {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ name: 'symbol' })
  public symbol: string;

  @Column({ name: 'address' })
  public address: string;

  @Column({ name: 'name' })
  public name: string;

  @Column({ name: 'type' })
  public type: string;

  @Column({ name: 'platform_id' })
  public platformId: number;

  @Column({ name: 'is_new' })
  public isNew: boolean;

  @OneToMany(() => AssetPrice, (assetPrice: AssetPrice) => assetPrice.asset)
  public assetPrices: AssetPrice[];
}

export default Asset;
