import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { IconSourceConfig } from '../../../common/types/IconSourceConfig.type';

@Entity({ name: 'icon_sources', orderBy: { name: 'ASC' } })
export class IconSourceEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: 'json' })
  config: IconSourceConfig;

  @Column()
  enabled: boolean;
}
