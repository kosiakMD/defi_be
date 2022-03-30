import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_invalid_address', orderBy: { name: 'ASC' } })
export class AssetsInvalidAddressEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  address: string;

  @Column({ type: Number, name: 'chain_id', nullable: false })
  chainId: number;
}
