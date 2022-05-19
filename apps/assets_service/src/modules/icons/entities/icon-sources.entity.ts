import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { IconSourceConfig } from '../../../common/types/icon-source-config.type';

@Entity({ name: 'icon_sources' })
export class IconSourceEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'json' })
  config: IconSourceConfig;

  @Column()
  enabled: boolean;
}
