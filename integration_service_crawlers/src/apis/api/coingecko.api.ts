import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoingeckoApi {
  protected apiUrl: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = configService.get<string>('COINGECKO_API_URL');
  }
  async getUSDPricesByIds(currencyId: string, coinsIds: string[]): Promise<any> {
    return this.httpService
      .get(this.apiUrl.concat('coins/markets'), {
        params: {
          // eslint-disable-next-line
          vs_currency: currencyId,
          ids: coinsIds.join(','),
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }

  async getPricesByAddresses(currencyId: string[], tokenAddresses: string[]): Promise<any> {
    return this.httpService
      .get(this.apiUrl.concat('simple/token_price/ethereum'), {
        params: {
          // eslint-disable-next-line
          vs_currencies: currencyId.join(','),
          // eslint-disable-next-line
          contract_addresses: tokenAddresses.join(','),
        },
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}
