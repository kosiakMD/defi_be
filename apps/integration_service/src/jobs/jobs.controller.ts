import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiResponse } from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import { NotifyPayloadFeaturesDto, SavePoolsResponseDto } from './notify.payload.features.dto';

@Controller('jobs')
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
