import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';
import { IChainMetadata } from '@app/common/interfaces/chain.metadata.interface';

@Entity('chains')
export class ChainsEntity extends BaseEntity {
  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public abbr: string;

  @Column({ type: 'json', nullable: false })
  public metadata: IChainMetadata;
}
