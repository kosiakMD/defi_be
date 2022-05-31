import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

import { OpportunityEntity } from './opportunity.entity';

@Entity({ name: 'farms' })
export class FarmEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  url: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @OneToMany(() => OpportunityEntity, (opportunity) => opportunity.farm)
  opportunities: OpportunityEntity[];
}
