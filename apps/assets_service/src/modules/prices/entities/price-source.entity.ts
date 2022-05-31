import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

import { PriceSourceStrategy } from '../enums/price-source-strategy.enum';

@Entity({ name: 'price_sources' })
export class PriceSourceEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  type: PriceSourceStrategy;

  @Column({ type: 'json' })
  config: unknown;

  @Column()
  enabled: boolean;
}
