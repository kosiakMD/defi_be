import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { SafeFilterOptionsQueryDto } from '../common/dto/safe-filter-options-query.dto';
import { BaseService } from '../common/services/base.service';

import { ProjectsResponseDto } from './dto/projects.response.dto';

@ApiTags('Safe')
@Controller('v1/projects')
export class ProjectsController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('SAFE_PROXY_SERVICE_HOST'),
    this.configService.get<string>('SAFE_PROXY_SERVICE_PORT'),
  );

  @Get('')
  @ApiResponse({ status: HttpStatus.OK, type: [ProjectsResponseDto] })
  getProjects(@Query() query: SafeFilterOptionsQueryDto): Promise<ProjectsResponseDto[]> {
    return this.requestProxy(this.url + 'v1/projects', 'GET', { params: query });
  }
}
