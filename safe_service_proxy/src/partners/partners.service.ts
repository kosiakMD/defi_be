import { plainToClass } from 'class-transformer';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PartnerDto } from './dto';

@Injectable()
export class PartnersService {
  private readonly baseUrl: string;
  private readonly getPartnersUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SAFE_API_URL');
    this.getPartnersUrl = this.configService.get<string>('SAFE_API_PARTNERS');
  }

  private getPartnerUrl(): string {
    return `${this.baseUrl}/${this.getPartnersUrl}`;
  }

  async getPartners(): Promise<PartnerDto[]> {
    try {
      return await lastValueFrom(
        this.httpService
          .post<PartnerDto[]>(this.getPartnerUrl())
          .pipe(map((response) => plainToClass(PartnerDto, response.data))),
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
