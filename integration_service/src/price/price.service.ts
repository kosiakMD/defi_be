import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { CurrentPricesPayload, PriceResponseDto } from '../dto/price.response.dto';

@Injectable()
export class PriceService {
  private readonly getPricesUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('PRICE_SERVICE_HOST');
    const port = this.configService.get<string>('PRICE_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;
    const getPricesPath = this.configService.get<string>('PRICES_PATH');
    this.getPricesUrl = `${url}/${getPricesPath}`;
  }

  async getTokenPrices(
    addressesArray: string[],
    chain: number,
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
}
