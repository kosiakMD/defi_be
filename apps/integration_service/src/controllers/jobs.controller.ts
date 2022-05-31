import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

import { NotifyPayloadFeaturesDto } from '../common/dto';

import { SavePoolsResponseDto } from '../modules/jobs/dto/save.pools.response.dto';
import { JobsService } from '../modules/jobs/jobs.service';

@Controller('v1/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiBody({ type: [NotifyPayloadFeaturesDto] })
  @ApiResponse({ status: HttpStatus.OK, type: SavePoolsResponseDto })
  savePoolsToCache(
    @Body() notifyPayloadFeaturesDto: NotifyPayloadFeaturesDto[],
  ): Promise<SavePoolsResponseDto> {
    return this.jobsService.saveFeatureToCache(notifyPayloadFeaturesDto);
  }
}
