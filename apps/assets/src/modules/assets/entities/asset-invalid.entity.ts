import { Column, Entity, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Unique(['address', 'chainId'])
@Entity({ name: 'assets_invalid_address' })
export class AssetInvalidEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  address: string;

  @Column({ type: Number, nullable: false })
  chainId: number;

  @Column({ type: Number, nullable: false })
  retries: number;
}
