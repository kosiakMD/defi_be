import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { TaskUpdateDto } from '../../common/dtos/task.dto';
import { TaskInterface } from '../../common/interfaces/task.interfaces';

import { CronService } from '../cron/cron.service';
import { TaskRepository } from './repositories/task.repository';

@Injectable()
export class TaskService implements OnApplicationBootstrap {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,

    @InjectRepository(TaskRepository)
    private readonly taskRepository: TaskRepository,
    private httpService: HttpService,
    private cronService: CronService,
  ) {}

  /**
   * Fetch all existing tasks in database and resume active cron jobs
   */
  public async onApplicationBootstrap() {
    const tasks = await this.taskRepository.find({ where: { isActive: true } });
    tasks.forEach((task) => this.cronService.start(task, () => this.execute(task)));
  }

  /**
   * Save a new cron
   */
  public async store(body): Promise<TaskInterface> {
    const { identifiers } = await this.taskRepository.insert(body);
    const task = await this.taskRepository.findOne(identifiers[0]);
    this.cronService.start(task, () => this.execute(task));
    return task;
  }

  /**
   * Find a specific cron
   * TODO: with task_history?
   */
  public async find(id: number): Promise<any> {
    return this.taskRepository.findOne(id);
  }

  /**
   * Search/List crons
   * TODO: pagination
   */
  public async search(query: any): Promise<any[]> {
    JSON.stringify({ query });
    return this.taskRepository.find();
  }

  /**
   * Search/List crons
   * TODO: pagination
   */
  public async update(id: number, body: TaskUpdateDto): Promise<any> {
    const preUpdate = await this.taskRepository.findOne(id);
    await this.taskRepository.update(id, body);
    const task = await this.taskRepository.findOne(id);
    if (preUpdate.isActive) {
      this.cronService.stop(task);
    }

    if (task.isActive) {
      this.cronService.start(task, () => this.execute(task));
    }
    return task;
  }

  public async destroy(id: number): Promise<any> {
    const task = await this.taskRepository.findOne(id);
    const { affected } = await this.taskRepository.delete(id);
    this.cronService.stop(task);
    return affected >= 0;
  }

  public async trigger(id: number): Promise<any> {
    // fetch and trigger the specific endpoint
    const result = await this.taskRepository.findOne(id);
    const success = await this.execute(result);
    return {
      success,
      task: result,
    };
  }

  private async execute(task: TaskInterface) {
    try {
      this.logger.log(`Begin Task ${task.id}: ${task.method} => ${task.endpoint}`);
      await firstValueFrom(
        this.httpService.request({
          method: task.method,
          url: task.endpoint,
        }),
      );
      this.logger.log(`Complete Task ${task.id}: ${task.method} => ${task.endpoint}`);
      return true;
    } catch (err) {
      this.logger.error(err.message, err.stack);
      return false;
    }
  }
}
