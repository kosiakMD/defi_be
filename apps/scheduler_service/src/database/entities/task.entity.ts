import { Column, Entity } from 'typeorm';

import { BaseEntity } from '@app/common/entities/Base.entity';

import { HttpMethod, TaskInterface, URLEndpoint } from '../../common/interfaces/task.interfaces';

@Entity({ name: 'tasks' })
export class TaskEntity extends BaseEntity implements TaskInterface {
  @Column({ name: 'endpoint' })
  endpoint: URLEndpoint;

  @Column({ name: 'method', default: 'GET' })
  method: HttpMethod;

  @Column({ name: 'cron' })
  cron: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
