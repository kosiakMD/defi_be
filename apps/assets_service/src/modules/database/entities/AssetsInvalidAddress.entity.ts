import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'asset_category', orderBy: { name: 'ASC' } })
export class AssetInvalidAddressEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  address: string;

  @Column({ type: Number, name: 'chain_id', nullable: false })
  chainId: number;
}
