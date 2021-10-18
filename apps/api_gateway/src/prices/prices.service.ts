import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { RequestErrorHandler } from '../common/decorators';

import {
  ChainDto,
  CurrencyDto,
  PriceQueryDto,
  PriceResponseDto,
  PricesPayload,
  PriceBatchRequestDto,
  PriceRangeRequestDto,
  CurrencyListDto,
} from './dto';

@Injectable()
export class PricesService {
  private readonly getStatusUrl: string;
  private readonly getPricesUrl: string;
  private readonly getChainsUrl: string;
  private readonly getCurrenciesUrl: string;
  private readonly getCurrencyPricesUrl: string;
  private readonly getBatchPath: string;
  private readonly getRangePath: string;

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
    this.getCurrencyPricesUrl = `${url}/${currenciesPath}/quotes`;

    const batchPath = this.configService.get<string>('PRICE_BATCH_PATH');
    this.getBatchPath = `${url}/${batchPath}`;

    const rangePath = this.configService.get<string>('PRICE_RANGE_PATH');
    this.getRangePath = `${url}/${rangePath}`;
  }

  @RequestErrorHandler()
  async isHealthy(): Promise<HealthCheckResult> {
    const timeMark = 'request: ' + this.getStatusUrl;

    this.logger.time(timeMark);
    const data = await this.httpService
      .get(this.getStatusUrl)
      .pipe(map((response) => response.data))
      .toPromise();
    this.logger.timeEnd(timeMark);
    return data;
  }

  @RequestErrorHandler()
  async getPrices(query: PriceQueryDto): Promise<PriceResponseDto<PricesPayload>> {
    const timeMark = 'request: ' + this.getPricesUrl;

    this.logger.time(timeMark);

    const data = await this.httpService
      .post(this.getPricesUrl, query)
      .pipe(map((response) => response.data))
      .toPromise();

    this.logger.timeEnd(timeMark);

    return data;
  }

  @RequestErrorHandler()
  async getPricesInBatch(query: PriceBatchRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    const timeMark = 'request: ' + this.getBatchPath;

    this.logger.time(timeMark);

    const data = await this.httpService
      // TODO: Path should be in config. Just quick fix.
      .post(this.getBatchPath, query)
      .pipe(map((response) => response.data))
      .toPromise();

    this.logger.timeEnd(timeMark);

    return data;
  }

  @RequestErrorHandler()
  async getPricesInRange(query: PriceRangeRequestDto): Promise<PriceResponseDto<PricesPayload>> {
    const timeMark = 'request: ' + this.getRangePath;

    this.logger.time(timeMark);

    const data = await this.httpService
      // TODO: Path should be in config. Just quick fix.
      .post(this.getRangePath, query)
      .pipe(map((response) => response.data))
      .toPromise();

    this.logger.timeEnd(timeMark);

    return data;
  }

  @RequestErrorHandler()
  async getChains(): Promise<ChainDto[]> {
    const timeMark = 'request: ' + this.getChainsUrl;

    this.logger.time(timeMark);
    const data = await this.httpService
      .get(this.getChainsUrl)
      .pipe(map((response) => response.data))
      .toPromise();
    this.logger.timeEnd(timeMark);
    return data;
  }

  @RequestErrorHandler()
  async getCurrencies(): Promise<CurrencyDto[]> {
    const timeMark = 'request: ' + this.getCurrenciesUrl;

    this.logger.log(this.getCurrenciesUrl, 'URL');
    this.logger.time(timeMark);
    const data = await this.httpService
      .get(this.getCurrenciesUrl)
      .pipe(map((response) => response.data))
      .toPromise();
    this.logger.timeEnd(timeMark);
    return data;
  }

  @RequestErrorHandler()
  async getCurrencyPrices(): Promise<CurrencyListDto> {
    const timeMark = 'request: ' + this.getCurrencyPricesUrl;

    this.logger.log(this.getCurrencyPricesUrl, 'URL');
    this.logger.time(timeMark);
    const data = await this.httpService
      .get(this.getCurrencyPricesUrl)
      .pipe(map((response) => response.data))
      .toPromise();
    this.logger.timeEnd(timeMark);
    return data;
  }
}
