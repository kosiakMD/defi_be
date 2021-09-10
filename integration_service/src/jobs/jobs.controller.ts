import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

import { JobsService } from './jobs.service';
import { NotifyPayloadFeaturesDto } from './notify.payload.features.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiBody({ type: [NotifyPayloadFeaturesDto] })
  savePoolsToCache(
    @Body() notifyPayloadFeaturesDto: NotifyPayloadFeaturesDto[],
  ): Promise<{ success: boolean; count: number }> {
    return this.jobsService.saveFeatureToCache(notifyPayloadFeaturesDto);
  }
}
