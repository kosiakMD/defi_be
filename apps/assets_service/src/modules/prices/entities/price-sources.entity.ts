import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { PriceSourceStrategies } from '../../../common/enum/PriceSourceStrategies.enum';
import { PriceSourceConfig } from '../../../common/types/PriceSourceConfig.type';

import { PriceSourceMetadata } from '../dto/PriceSourceMetadata.dto';

@Entity({ name: 'price_sources', orderBy: { name: 'ASC' } })
export class PriceSourceEntity extends BaseEntity {
  @Column()
  name: string;

  @Column()
  type: PriceSourceStrategies;

  @Column({ type: 'json' })
  config: PriceSourceConfig;

  @Column()
  enabled: boolean;

  @Column({ type: 'json' })
  metadata: PriceSourceMetadata;
}
