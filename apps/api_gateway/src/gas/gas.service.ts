import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { GasHistory } from '@app/common/interfaces';
import { Logger } from '@app/common/logger/logger.service';

import { GasPriceDto } from './dto/gas.price.dto';

@Injectable()
export class GasService {
  private readonly gasCurrentUrl: string;
  private readonly gasHistoryUrl: string;

  private readonly gasCurrentApiKey: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const curEntUrl = this.configService.get<string>('GAS_API_URL');
    const currentPath = this.configService.get<string>('GAS_CURRENT_PATH');
    this.gasCurrentApiKey = this.configService.get<string>('GAS_API_KEY');
    this.gasCurrentUrl = `${curEntUrl}/${currentPath}`;

    const hisOryUrl = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
    const historyPath = this.configService.get<string>('GAS_HISTORY_PATH');
    this.gasHistoryUrl = `${hisOryUrl}/${historyPath}`;
  }

  async getGasCurrent(): Promise<GasPriceDto> {
    try {
      this.logger.time(this.gasCurrentUrl);
      const data = this.httpService
        .get(this.gasCurrentUrl, {
          params: {
            'api-key': this.gasCurrentApiKey,
          },
        })
        .pipe(
          map(({ data }) =>
            plainToClass(GasPriceDto, {
              ...data,
              timestamp: Date.now(),
            }),
          ),
        )
        .toPromise();
      this.logger.timeEnd(this.gasCurrentUrl);
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  async getGasHistory(): Promise<GasHistory[]> {
    try {
      this.logger.time(this.gasHistoryUrl);
      const data = this.httpService
        .get(this.gasHistoryUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.gasHistoryUrl);
      return data;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
