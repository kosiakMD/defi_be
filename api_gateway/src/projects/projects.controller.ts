import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SafeProxyService } from 'src/safe-proxy/safe.proxy.service';

import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { SafeFilterOptionsQueryDto } from 'src/common/DTO/SafeFilterOptionsQuery.dto';
import { Logger } from 'src/common/Logger/Logger.service';

import { ProjectsResponseDto } from './dto';

@ApiTags('Safe')
@Controller('projects')
export class ProjectsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private safeProxyService: SafeProxyService,
  ) {}

  @Get('')
  @ApiResponse({ status: 200, type: [ProjectsResponseDto] })
  getProjects(@Query() query: SafeFilterOptionsQueryDto): Promise<ProjectsResponseDto[]> {
    try {
      return this.safeProxyService.getProjects(query);
    } catch (e) {
      this.logger.error(e, 'SafeProxyService.getProjects');
      throw e;
    }
  }
}
