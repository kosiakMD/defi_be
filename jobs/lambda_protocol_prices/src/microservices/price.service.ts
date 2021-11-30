import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainIdEnum,
  CurrentPricesPayload,
  Logger,
  PriceResponseDto,
  RequestErrorHandler,
} from '@app/common';
import { IPriceRequestCurrent } from '@app/common/interfaces/price.request.current';

@Injectable()
export class PriceService {
  private readonly pricesFetchUrl: string;
  private readonly pricesCurrentUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const pricesFetchPath = 'v1/prices/fetch';
    const pricesCurrentPath = 'v1/prices/current';

    this.pricesFetchUrl = new URL(pricesFetchPath, host).href;
    this.pricesCurrentUrl = new URL(pricesCurrentPath, host).href;
  }

  @RequestErrorHandler()
  async getPrices(
    addresses: Address[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const timeKey = `POST: ${this.pricesFetchUrl} - Chain: ${chain}`;
    this.logger.time(timeKey);
    const data$ = await this.httpService
      .post(this.pricesFetchUrl, {
        chain: chain,
        addresses: addresses.join(','),
      })
      .pipe(map((r) => r.data));

    const data = await firstValueFrom(data$);
    this.logger.timeEnd(timeKey);
    return data;
  }

  @RequestErrorHandler()
  async savePrices(prices: IPriceRequestCurrent[]): Promise<void> {
    const timeKey = `POST: ${this.pricesCurrentUrl} - Prices Updating: ${prices.length}`;

    this.logger.time(timeKey);

    const prices$ = this.httpService
      .post(this.pricesCurrentUrl, prices)
      .pipe(map((r) => r.data.data));

    await firstValueFrom(prices$);

    this.logger.timeEnd(timeKey);
    return;
  }
}
