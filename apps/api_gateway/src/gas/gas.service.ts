import { Cache } from 'cache-manager';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { GasHistory, GasPrice } from '@app/common/interfaces';

interface GasServiceResponse {
  code: number;
  data: GasPrice;
}

@Injectable()
export class GasService {
  private readonly gasCurrentUrl: string;
  private readonly gasHistoryUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    const curEntUrl = this.configService.get<string>('GAS_API_URL');
    const currentPath = this.configService.get<string>('GAS_CURRENT_PATH');
    this.gasCurrentUrl = `${curEntUrl}/${currentPath}`;

    const hisOryUrl = this.configService.get<string>('DEFIYIELD_INFO_2_URL');
    const historyPath = this.configService.get<string>('GAS_HISTORY_PATH');
    this.gasHistoryUrl = `${hisOryUrl}/${historyPath}`;
  }

  async getGasCurrent(): Promise<GasServiceResponse> {
    try {
      this.logger.time(this.gasCurrentUrl);
      const data = this.httpService
        .get(this.gasCurrentUrl)
        .pipe(map((r) => r.data.data))
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
