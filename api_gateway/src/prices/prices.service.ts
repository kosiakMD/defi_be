import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../common/Logger/Logger.service';
import { ChainDto, CurrencyDto, PriceQueryDto, PriceResponseDto, PricesPayload } from './dto';

@Injectable()
export class PricesService {
  private readonly getStatusUrl: string;
  private readonly getPricesUrl: string;
  private readonly getChainsUrl: string;
  private readonly getCurrenciesUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getStatusPath = this.configService.get<string>('PRICE_STATUS');
    this.getStatusUrl = `${url}/${getStatusPath}`;

    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;

    const chainsPath = this.configService.get<string>('PRICE_CHAINS_PATH');
    this.getChainsUrl = `${url}/${chainsPath}`;

    const currenciesPath = this.configService.get<string>('PRICE_CURRENCIES_PATH');
    this.getCurrenciesUrl = `${url}/${currenciesPath}`;
  }

  async isHealthy(): Promise<HealthCheckResult> {
    try {
      this.logger.time('request: ' + this.getStatusUrl);
      const data = await this.httpService
        .get(this.getStatusUrl)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd('request: ' + this.getStatusUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getPrices(query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    try {
      this.logger.time('request: ' + this.getPricesUrl);

      const data = await this.httpService
        .post(this.getPricesUrl, query)
        .pipe(map((response) => response.data))
        .toPromise();

      this.logger.timeEnd('request: ' + this.getPricesUrl);

      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getChains(): Promise<ChainDto[]> {
    try {
      this.logger.time('request: ' + this.getChainsUrl);
      const data = await this.httpService
        .get(this.getChainsUrl)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd('request: ' + this.getChainsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getCurrencies(): Promise<CurrencyDto[]> {
    try {
      this.logger.log(this.getCurrenciesUrl, 'URL');
      this.logger.time('request: ' + this.getCurrenciesUrl);
      const data = await this.httpService
        .get(this.getCurrenciesUrl)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd('request: ' + this.getCurrenciesUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }
}
