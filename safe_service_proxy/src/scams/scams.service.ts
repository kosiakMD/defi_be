import { plainToClass } from 'class-transformer';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FilterOptionsQueryDto } from 'src/common/dto/filter.options.query.dto';

import { ScamFunctionResponseDto, ScamsResponseDto, ScamTypeResponseDto } from './dto';

@Injectable()
export class ScamsService {
  private readonly baseUrl: string;
  private readonly getScamsUrl: string;
  private readonly getScamTypesUrl: string;
  private readonly getScamFunctionsUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SAFE_API_URL');
    this.getScamsUrl = this.configService.get<string>('SAFE_API_SCAMS');
    this.getScamTypesUrl = this.configService.get<string>('SAFE_API_SCAM_TYPES');
    this.getScamFunctionsUrl = this.configService.get<string>('SAFE_API_SCAM_FUNCTIONS');
  }

  async getScams(options: FilterOptionsQueryDto): Promise<ScamsResponseDto> {
    try {
      const query = `${this.baseUrl}/${this.getScamsUrl}`;

      return await lastValueFrom(
        this.httpService
          .get(query, { params: options })
          .pipe(map((response) => plainToClass(ScamsResponseDto, response.data))),
      ).catch((e) => {
        throw new HttpException(e.response.data.message, e.response.data.statusCode);
      });
    } catch (e) {
      if (e.isAxiosError) {
        throw new HttpException(e.response, e.code);
      } else {
        throw e;
      }
    }
  }

  async getScamTypes(): Promise<ScamTypeResponseDto[]> {
    try {
      const query = `${this.baseUrl}/${this.getScamTypesUrl}`;

      return await lastValueFrom(
        this.httpService
          .get<ScamTypeResponseDto[]>(query)
          .pipe(map((response) => plainToClass(ScamTypeResponseDto, response.data))),
      ).catch((e) => {
        throw new HttpException(e.response.data.message, e.response.data.statusCode);
      });
    } catch (e) {
      if (e.isAxiosError) {
        throw new HttpException(e.response, e.code);
      } else {
        throw e;
      }
    }
  }

  async getScamFunctions(): Promise<ScamFunctionResponseDto[]> {
    try {
      const query = `${this.baseUrl}/${this.getScamFunctionsUrl}`;

      return await lastValueFrom(
        this.httpService
          .get<ScamFunctionResponseDto[]>(query)
          .pipe(map((response) => plainToClass(ScamFunctionResponseDto, response.data))),
      ).catch((e) => {
        throw new HttpException(e.response.data.message, e.response.data.statusCode);
      });
    } catch (e) {
      if (e.isAxiosError) {
        throw new HttpException(e.response, e.code);
      } else {
        throw e;
      }
    }
  }
}
