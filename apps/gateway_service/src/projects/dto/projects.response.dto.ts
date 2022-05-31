import { ApiProperty } from '@nestjs/swagger';

import { NetworkInformationDto } from './network.information.dto';
import { ProjectDto } from './project.dto';

export class ProjectsResponseDto {
  @ApiProperty({ type: [ProjectDto] })
  projects: ProjectDto[];

  @ApiProperty({ type: Number, example: 1 })
  currentPage: number;

  @ApiProperty({ type: Number, example: 104 })
  lastPage: number;

  @ApiProperty({ type: Number, example: 1037 })
  count: number;

  @ApiProperty({ type: [NetworkInformationDto] })
  networksInformation: NetworkInformationDto[];
}
