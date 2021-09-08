import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ChainDto } from '../../lookup/models';
import { AssetPrice } from './asset_price.entity';

@Entity({ name: 'prices.asset' })
export class Asset {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  symbol: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @Column()
  address: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ name: 'platform_id' })
  platformId: number;

  @Column({ name: 'is_new' })
  isNew: boolean;

  @OneToMany(() => AssetPrice, (assetPrice: AssetPrice) => assetPrice.asset)
  assetPrices: AssetPrice[];

  @ManyToOne(() => ChainDto)
  @JoinColumn({ name: 'chain_id' })
  chain: ChainDto;
}
