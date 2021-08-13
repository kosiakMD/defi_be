import { plainToClass } from 'class-transformer';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NetworkResponseDto } from './dto';

@Injectable()
export class NetworksService {
  private readonly baseUrl: string;
  private readonly getNetworksUrl: string;

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('SAFE_API_URL');
    this.getNetworksUrl = this.configService.get<string>('SAFE_API_NETWORKS');
  }

  private getNetworkUrl(): string {
    return `${this.baseUrl}/${this.getNetworksUrl}`;
  }

  async getNetworks(): Promise<NetworkResponseDto[]> {
    try {
      return await lastValueFrom(
        this.httpService
          .post<NetworkResponseDto[]>(this.getNetworkUrl())
          .pipe(map((response) => plainToClass(NetworkResponseDto, response.data))),
      );
    } catch (e) {
      if (e.isAxiosError) {
        throw new HttpException(e.response, e.code);
      } else {
        throw e;
      }
    }
  }
}
