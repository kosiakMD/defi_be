import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

@Entity('chains')
export class ChainsEntity extends BaseEntity {
  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public abbr: string;

  @Column({ type: 'json', nullable: false })
  public metadata: IChainMetadata;
}

interface IChainMetadata {
  absoluteChainId: string;
  coingeckoPlatformId: string;
  debankPlatformId: string;
  network: {
    type: string;
  };
}
