import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { FilterOptionsQueryDto } from 'src/common/dto/filter.options.query.dto';

import { ProjectsResponseDto } from './dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get('')
  @ApiResponse({ status: 200, type: ProjectsResponseDto })
  getProjects(@Query() query: FilterOptionsQueryDto): Promise<ProjectsResponseDto> {
    return this.projectsService.getProjects(query);
  }
}
