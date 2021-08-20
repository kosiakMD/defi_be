import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NetworkInformationDto } from './network.information.dto';
import { ProjectDto } from './project.dto';

@Exclude()
export class ProjectsResponseDto {
  @Expose()
  @Transform(({ obj }) => plainToClass(ProjectDto, obj.items))
  @ApiProperty({ type: [ProjectDto] })
  projects: ProjectDto[];

  @Expose()
  @ApiProperty({ type: Number, example: 1 })
  currentPage: number;

  @Expose()
  @ApiProperty({ type: Number, example: 104 })
  lastPage: number;

  @Expose()
  @ApiProperty({ type: Number, example: 1037 })
  count: number;

  @Expose()
  @Transform(({ obj }) => plainToClass(NetworkInformationDto, obj.networkStats))
  @ApiProperty({ type: [NetworkInformationDto] })
  networksInformation: NetworkInformationDto[];
}
