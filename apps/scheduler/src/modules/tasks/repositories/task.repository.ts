import { TaskEntity } from 'apps/scheduler/src/database/entities/task.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(TaskEntity)
export class TaskRepository extends Repository<TaskEntity> {
  //
}
