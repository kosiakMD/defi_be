import { TaskEntity } from 'apps/scheduler_service/src/database/entities/task.entity';
import { EntityRepository, Repository } from 'typeorm';

@EntityRepository(TaskEntity)
export class TaskRepository extends Repository<TaskEntity> {
  //
}
