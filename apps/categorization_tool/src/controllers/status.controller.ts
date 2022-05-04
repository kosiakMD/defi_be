import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { TasksService } from '../modules/tasks/tasks.service';

@ApiTags('Common')
@Controller('')
export class StatusController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('/v1/status')
  async status() {
    return {
      status: 'OK',
      jobs: await this.tasksService.getJobsStats(),
    };
  }
}
