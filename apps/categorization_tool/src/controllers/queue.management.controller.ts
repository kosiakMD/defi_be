import { JobStatusClean } from 'bull';

import { Controller, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { TasksService } from '../modules/tasks/tasks.service';

@ApiTags('Queue Management')
@Controller('/v1/queue')
export class QueueManagementController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('/clean')
  @ApiQuery({
    name: 'limit',
    description:
      'Maximum amount of jobs to clean per call. If not provided will clean all matching jobs',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description:
      'Status of the job to clean. Values are completed, wait, active, delayed, and failed. Defaults to completed',
    example: 'failed',
    required: false,
  })
  @ApiQuery({ name: 'grace', description: 'Grace period in milliseconds', example: 5000 })
  cleanQueue(@Query() query: { grace: number; status?: JobStatusClean; limit?: number }) {
    return this.tasksService.cleanQueue(query.grace, query.status, query.limit);
  }
}
