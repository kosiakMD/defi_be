import { Body, Controller, Post } from "@nestjs/common";
import { NotifyPayloadFeaturesDto } from "./notifyPayloadFeatures.dto";
import { JobsService } from "./jobs.service";
import { ApiBody } from "@nestjs/swagger";

@Controller('jobs')
export class JobsController {
    constructor(private readonly jobsService: JobsService) {}

    @Post()
    @ApiBody({ type: [NotifyPayloadFeaturesDto] })
    savePoolsToCache(
      @Body() notifyPayloadFeaturesDto: NotifyPayloadFeaturesDto[],
    ): Promise<{ success: boolean, count: number }> {
      return this.jobsService.saveFeatureToCache(notifyPayloadFeaturesDto)
    }
}
