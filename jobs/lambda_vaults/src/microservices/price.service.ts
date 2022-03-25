import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, CurrentPricesPayload, PriceResponseDto } from '@app/common';

import { Logger } from '../logger/logger.service';

@Injectable()
export class PriceService {
  private readonly getCurrentPricesUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('PRICE_SERVICE_URL');
    const getCurrentPricesUrl = 'v1/prices/fetch';
    this.getCurrentPricesUrl = new URL(getCurrentPricesUrl, url).href;
  }

  async getCurrentPrices(
    addresses: string[] | string,
    currency: CurrencyIdEnum,
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    try {
      return await this.httpService
        .post(this.getCurrentPricesUrl, {
          chain: chain,
          currency: currency,
          addresses: Array.isArray(addresses)
            ? Array.from(new Set(addresses)).join(',') // dedupe & stringify
            : addresses, // pass raw
        })
        .pipe(map((r) => r.data))
        .toPromise();
    } catch (e: any) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      throw e;
    }
  }
}
