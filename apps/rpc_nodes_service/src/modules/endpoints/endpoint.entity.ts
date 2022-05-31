import { Column, Entity, Unique } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

@Unique(['endpoint', 'chainId'])
@Entity({ name: 'endpoints' })
export class EndpointEntity extends BaseEntity {
  @Column({ nullable: false })
  endpoint: string;

  @Column({ nullable: false })
  chainId: number;

  @Column({ default: true, nullable: false })
  isEnabled: boolean;

  @Column({ default: 0, nullable: false })
  priority: number;

  @Column({ default: true, nullable: false })
  archived: boolean;
}
