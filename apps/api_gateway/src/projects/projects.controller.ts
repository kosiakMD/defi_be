import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { SafeFilterOptionsQueryDto } from '@app/common/dto/SafeFilterOptionsQuery.dto';

import { SafeProxyService } from '../safe-proxy/safe.proxy.service';
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
