import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/base.entity';

@Entity({ name: 'icon_sources' })
export class IconSourceEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: 'json' })
  config: any;

  @Column()
  enabled: boolean;
}
