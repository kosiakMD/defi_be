import { Queue } from 'bull';

import { InjectQueue } from '@nestjs/bull';
import { Body, Controller, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssetJobName, PriceJobName } from '../common/enum/job-name.enum';
import { QueueName } from '../common/enum/queue-name.enum';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    @InjectQueue(QueueName.ASSETS) private readonly assetsQueue: Queue,
    @InjectQueue(QueueName.PRICES) private readonly priceQueue: Queue,
  ) {}

  @Post()
  // NOTE: Job type is past here as query parameter as it's better displayed by swagger
  @ApiQuery({ name: 'job', enum: { ...PriceJobName, ...AssetJobName } })
  @ApiResponse({ status: HttpStatus.OK | HttpStatus.BAD_REQUEST })
  async get(@Query('job') job: PriceJobName | AssetJobName, @Body() jobParams: unknown) {
    if (Object.values(PriceJobName).includes(job as PriceJobName)) {
      await this.priceQueue.add(job, jobParams);
      return HttpStatus.OK;
    }

    if (Object.values(AssetJobName).includes(job as AssetJobName)) {
      await this.assetsQueue.add(job, jobParams);
      return HttpStatus.OK;
    }

    return HttpStatus.BAD_REQUEST;
  }
}
