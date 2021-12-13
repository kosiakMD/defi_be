import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, CurrencyIdEnum } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { CurrentPricesPayload, PriceResponseDto } from '../../common/dto/price.response.dto';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;
  private readonly getPriceUrlFetch: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const url = this.configService.get<string>('PRICE_SERVICE_URL').replace(/\/$/, '');
    this.getPricesUrl = `${url}/v1/prices`;
    this.getPriceUrlFetch = `${url}/v1/prices/fetch`;
  }

  async getTokenPrices(
    addressesArray: Address[],
    chain: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = addressesArray.join(',');
    return this.httpService
      .post<PriceResponseDto<CurrentPricesPayload>>(this.getPricesUrl, {
        chain,
        addresses,
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
    addressesArray: Address[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const addresses = addressesArray.join(',');
    return this.httpService
      .post<PriceResponseDto<CurrentPricesPayload>>(this.getPriceUrlFetch, {
        chain: chainId,
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
