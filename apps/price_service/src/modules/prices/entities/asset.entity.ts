import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { ChainEntity } from '../../lookup/entities/chain.entity';
import { AssetPriceEntity } from './asset_price.entity';

@Entity({ name: 'prices.asset' })
export class AssetEntity {
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

  @OneToMany(() => AssetPriceEntity, (assetPrice: AssetPriceEntity) => assetPrice.asset)
  assetPrices: AssetPriceEntity[];

  @ManyToOne(() => ChainEntity)
  @JoinColumn({ name: 'chain_id' })
  chain: ChainEntity;
}
