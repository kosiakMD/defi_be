import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { PriceSourceTypes } from '../../../common/enum/PriceSourceTypes.enum';
import { PriceSourceConfig } from '../../../common/types/PriceSourceConfig.type';

@Entity({ name: 'price_sources', orderBy: { name: 'ASC' } })
export class PriceSourceEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  type: PriceSourceTypes;

  @Column({ type: 'json' })
  config: PriceSourceConfig;

  @Column()
  enabled: boolean;
}
