import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity({ name: 'assets_candidate', orderBy: { name: 'ASC' } })
export class AssetsCandidateEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  public address: string;

  @Column({ type: Number, name: 'chain_id', nullable: false })
  public chainId: number;
}
