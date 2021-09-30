import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum } from '../config/enum';
import { Logger } from '../logger/logger.service';

@Injectable()
export class PriceService {
  private readonly getCurrentPricesUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const url = this.configService.get<string>('PRICE_SERVICE_URL').replace(/\/$/, '');
    const getCurrentPricesUrl = 'v1/prices/fetch';

    this.getCurrentPricesUrl = `${url}/${getCurrentPricesUrl}`;
  }

  async getCurrentPrices(
    addresses: string,
    currency: CurrencyIdEnum,
    chain: ChainIdEnum,
  ): Promise<any> {
    try {
      return await this.httpService
        .post(this.getCurrentPricesUrl, {
          chain: chain,
          currency: currency,
          addresses: addresses,
        })
        .pipe(map((r) => r.data))
        .toPromise();
    } catch (e) {
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
