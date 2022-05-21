import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JobName } from '../common/enum/job-name.enum';

import { PriceJobEmitter } from '../modules/prices/price-job.emitter';

@ApiTags('PriceJobEmitter')
@Controller('price-job-emitter')
export class PriceJobEmitterController {
  constructor(private priceJobEmitter: PriceJobEmitter) {}

  @Get('/:job')
  @ApiParam({ name: 'job', enum: JobName })
  @ApiResponse({ status: HttpStatus.OK })
  async get(@Param('job') job: JobName) {
    this.priceJobEmitter.emitJob(job);
    return HttpStatus.OK;
  }
}
