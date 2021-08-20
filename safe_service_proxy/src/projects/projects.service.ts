import { plainToClass } from 'class-transformer';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FilterOptionsQueryDto } from 'src/common/dto/filter.options.query.dto';

import { ProjectsResponseDto } from './dto';

@Injectable()
export class ProjectsService {
  private readonly baseUrl: string;
  private readonly getProjectsUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SAFE_API_URL');
    this.getProjectsUrl = this.configService.get<string>('SAFE_API_PROJECTS');
  }

  async getProjects(options: FilterOptionsQueryDto): Promise<ProjectsResponseDto> {
    try {
      const query = `${this.baseUrl}/${this.getProjectsUrl}`;

      const result = await lastValueFrom(
        this.httpService
          .get(query, { params: options })
          .pipe(map((response) => plainToClass(ProjectsResponseDto, response.data))),
      ).catch((e) => {
        throw new HttpException(e.response.data.message, e.response.data.statusCode);
      });

      return result;
    } catch (e) {
      if (e.isAxiosError) {
        throw new HttpException(e.response, e.code);
      } else {
        throw e;
      }
    }
  }
}
