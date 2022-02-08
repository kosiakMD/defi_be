import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_new', orderBy: { name: 'ASC' } })
export class AssetsEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  address: string;

  @Column({ type: String, nullable: true })
  name: string;

  @Column({ type: String, nullable: true })
  symbol: string;

  @Column({ type: Boolean, name: 'icon_loaded' })
  iconLoaded: boolean;

  @Column({ type: String, name: 'icon_extention' })
  iconExtention: string;

  @Column({ type: Number, name: 'chain_id', nullable: false })
  chainId: number;

  @Column({ type: Number, name: 'decimals', nullable: false })
  decimals: number;

  @Column({ type: Boolean, name: 'is_tracked' })
  isTracked: boolean;

  @Column({ type: Boolean, nullable: false })
  disabled: boolean;
}
