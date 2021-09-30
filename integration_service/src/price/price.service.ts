import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum, CurrencyIdEnum } from '../common/enum';

import { CurrentPricesPayload, PriceResponseDto } from '../dto/price.response.dto';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getPriceUrlFetch: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
    this.getPriceUrlFetch = `${this.getPricesUrl}/fetch`;
  }

  async getTokenPrices(
    addressesArray: string[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = await addressesArray.join(',');
    return this.httpService
      .get<PriceResponseDto<CurrentPricesPayload>>(this.getPricesUrl, {
        params: {
          chain,
          addresses,
        },
      })
      .pipe(map((response) => response.data))
      .toPromise()
      .catch(() => {
        const pricePayload: CurrentPricesPayload = {};

        addressesArray.forEach((item) => {
          pricePayload[`${item}`] = 0;
        });
        return { chain: undefined, currency: undefined, prices: pricePayload };
      });
  }

  async getTokenPricesFetch(
    addressesArray: string[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = await addressesArray.join(',');
    return this.httpService
      .post<PriceResponseDto<CurrentPricesPayload>>(this.getPriceUrlFetch, {
        chain,
        addresses,
        currency: CurrencyIdEnum.usd,
      })
      .pipe(map((response) => response.data))
      .toPromise()
      .catch(() => {
        const pricePayload: CurrentPricesPayload = {};

        addressesArray.forEach((item) => {
          pricePayload[`${item}`] = null;
        });
        return { chain: undefined, currency: undefined, prices: pricePayload };
      });
  }
}
