import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JobName } from '../common/enum/job-name.enum';
import { QueueName } from '../common/enum/queue-name.enum';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(@InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue) {}

  @Post()
  // NOTE: Job type is past here as query parameter as it's better displayed by swagger
  @ApiQuery({ name: 'job', enum: JobName })
  @ApiResponse({ status: HttpStatus.OK | HttpStatus.BAD_REQUEST })
  async get(@Query('job') job: JobName, @Body() jobParams: unknown) {
    if (!Object.values(JobName).includes(job)) {
      return HttpStatus.BAD_REQUEST;
    }

    await this.assetsQueue.add(job, jobParams);
    return HttpStatus.OK;
  }
}
