import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { PriceSourceStrategies } from '../../../common/enum/price-source-strategies.enum';
import { PriceSourceConfig } from '../../../common/types/price-source-config.type';

export interface PriceSourceMetadata {
  lastOperation: number;
  lastExecutionHistoricalPricesJob: number;
}

@Entity({ name: 'price_sources' })
export class PriceSourceEntity extends BaseEntity {
  @Column({ unique: true })
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
