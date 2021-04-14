import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { AssetPrice } from './asset_price.entity';

@Entity({ name: 'prices.asset' })
export class Asset {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public symbol: string;

  @Column()
  public address: string;

  @Column()
  public name: string;

  @Column()
  public type: string;

  @Column({ name: 'platform_id' })
  public platformId: number;

  @Column({ name: 'is_new' })
  public isNew: boolean;

  @OneToMany(() => AssetPrice, (assetPrice: AssetPrice) => assetPrice.asset)
  public assetPrices: AssetPrice[];
}
