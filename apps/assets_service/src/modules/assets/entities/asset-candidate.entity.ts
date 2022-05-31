import { Column, Entity, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Unique(['address', 'chainId'])
@Entity({ name: 'assets_candidate' })
export class AssetCandidateEntity extends BaseEntity {
  @Column({ type: String, nullable: false })
  public address: string;

  @Column({ type: Number, nullable: false })
  public chainId: number;
}
